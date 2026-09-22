import { createHash, createHmac } from 'node:crypto';
import { existsSync } from 'node:fs';
import { rm } from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import express from 'express';
import { installS3Endpoint, _s3Test } from '../s3';

const API_SECRET = 'test-livekit-api-secret';
const RECORDING_ID = '019aaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const FILENAME = `${RECORDING_ID}.mp4`;
const PATH = `/s3/allpeep-recordings/${FILENAME}`;

const deriveSecret = (apiSecret: string, recordingId: string) =>
  createHmac('sha256', apiSecret)
    .update(`jam-recording-upload:${recordingId}`)
    .digest('hex');

const {
  findJamRecording,
  completeJamRecording,
  failJamRecording,
  finishRecording,
  jamRecordingUploadSecret,
  storeFromPath,
} = vi.hoisted(() => {
  const apiSecret = 'test-livekit-api-secret';
  const derive = (recordingId: string) =>
    createHmac('sha256', apiSecret)
      .update(`jam-recording-upload:${recordingId}`)
      .digest('hex');
  return {
    findJamRecording: vi.fn(),
    completeJamRecording: vi.fn(),
    failJamRecording: vi.fn(),
    finishRecording: vi.fn(),
    jamRecordingUploadSecret: vi.fn(async (id: string) => derive(id)),
    storeFromPath: vi.fn(async (_filePath: string) => ({
      key: 'stored-key',
      size: 5,
    })),
  };
});

vi.mock('@openpeepshq/core/jams', () => ({
  findJamRecording: (id: string) => findJamRecording(id),
  completeJamRecording: (id: string, attachment: unknown) =>
    completeJamRecording(id, attachment),
  failJamRecording: (id: string) => failJamRecording(id),
  finishRecording: (recording: unknown) => finishRecording(recording),
  jamRecordingUploadSecret: (id: string) => jamRecordingUploadSecret(id),
}));

vi.mock('@openpeepshq/core/media', () => ({
  mediaStorage: async () => ({
    store: async () => 'stored-key',
    getPath: (key: string, name: string) => `/media/${key}/${name}`,
  }),
  storeFromPath: (filePath: string) => storeFromPath(filePath),
}));

vi.mock('@openpeepshq/core/mediaAttachments', () => ({
  createMediaAttachment: async (data: unknown) => data,
}));

vi.mock('@openpeepshq/core/server', () => ({
  serverRootUrl: async () => 'https://community.example',
}));

vi.mock('@openpeepshq/core/log', () => ({
  logger: () => ({
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  }),
}));

const sha256Hex = (data: string | Buffer) =>
  createHash('sha256').update(data).digest('hex');

const hmac = (key: Buffer | string, data: string) =>
  createHmac('sha256', key).update(data, 'utf8').digest();

const signHeaders = (opts: {
  method: string;
  path: string;
  query: Record<string, string>;
  amzDate?: string;
}) => {
  const amzDate = opts.amzDate ?? '20260809T120000Z';
  const dateStamp = amzDate.slice(0, 8);
  const region = 'us-east-1';
  const secretKey = deriveSecret(API_SECRET, RECORDING_ID);
  const payloadHash = 'UNSIGNED-PAYLOAD';
  const headers: Record<string, string> = {
    host: 'community.example',
    'x-amz-date': amzDate,
    'x-amz-content-sha256': payloadHash,
    'x-amz-security-token': RECORDING_ID,
  };
  const signedHeaders = [
    'host',
    'x-amz-content-sha256',
    'x-amz-date',
    'x-amz-security-token',
  ];
  const canonicalHeaders = signedHeaders
    .map((name) => `${name}:${headers[name]}\n`)
    .join('');
  const canonicalQuery = Object.keys(opts.query)
    .sort()
    .map((k) => `${encodeURIComponent(k)}=${encodeURIComponent(opts.query[k])}`)
    .join('&');
  const canonicalRequest = [
    opts.method,
    opts.path,
    canonicalQuery,
    canonicalHeaders,
    signedHeaders.join(';'),
    payloadHash,
  ].join('\n');
  const stringToSign = [
    'AWS4-HMAC-SHA256',
    amzDate,
    `${dateStamp}/${region}/s3/aws4_request`,
    sha256Hex(canonicalRequest),
  ].join('\n');
  const signingKey = hmac(
    hmac(hmac(hmac(`AWS4${secretKey}`, dateStamp), region), 's3'),
    'aws4_request',
  );
  const signature = createHmac('sha256', signingKey)
    .update(stringToSign, 'utf8')
    .digest('hex');
  headers.authorization =
    `AWS4-HMAC-SHA256 Credential=${RECORDING_ID}/${dateStamp}/${region}/s3/aws4_request, ` +
    `SignedHeaders=${signedHeaders.join(';')}, Signature=${signature}`;
  return headers;
};

const request = (
  app: express.Express,
  opts: {
    method: 'PUT' | 'POST' | 'DELETE';
    path: string;
    headers?: Record<string, string>;
    body?: Buffer;
  },
): Promise<{ status: number; body: string }> =>
  new Promise((resolve, reject) => {
    const server = app.listen(0, '127.0.0.1', () => {
      const address = server.address() as net.AddressInfo;
      const req = http.request(
        {
          hostname: '127.0.0.1',
          port: address.port,
          path: opts.path,
          method: opts.method,
          headers: {
            host: 'community.example',
            'content-length': String(opts.body?.byteLength ?? 0),
            ...opts.headers,
          },
        },
        (response) => {
          let body = '';
          response.on('data', (chunk) => {
            body += chunk.toString();
          });
          response.on('end', () => {
            server.close(() =>
              resolve({ status: response.statusCode ?? 0, body }),
            );
          });
        },
      );
      req.on('error', (err) => {
        server.close(() => reject(err));
      });
      if (opts.body) req.write(opts.body);
      req.end();
    });
    server.on('error', reject);
  });

const activeRecording = () => ({
  id: RECORDING_ID,
  status: 'active',
  post: { id: 'post1', data: { name: 'Jam' } },
  profile: { id: 'p1' },
});

describe('installS3Endpoint', () => {
  let app: express.Express;
  const leakedDirs: string[] = [];

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 7, 9, 12, 0, 0)));
    findJamRecording.mockReset();
    completeJamRecording.mockReset();
    failJamRecording.mockReset();
    finishRecording.mockReset();
    storeFromPath.mockReset();
    storeFromPath.mockResolvedValue({ key: 'stored-key', size: 5 });
    jamRecordingUploadSecret.mockClear();
    _s3Test.resetCaps();
    app = express();
    installS3Endpoint(app);
  });

  afterEach(async () => {
    for (const uploadId of [..._s3Test.multipartUploads.keys()]) {
      await _s3Test.cleanupMultipartUpload(uploadId);
    }
    for (const dir of leakedDirs.splice(0)) {
      await rm(dir, { recursive: true, force: true });
    }
    vi.useRealTimers();
  });

  const initiateMultipart = async () => {
    findJamRecording.mockResolvedValue(activeRecording());
    const headers = signHeaders({
      method: 'POST',
      path: PATH,
      query: { uploads: '' },
    });
    const result = await request(app, {
      method: 'POST',
      path: `${PATH}?uploads`,
      headers,
    });
    expect(result.status).toBe(200);
    const uploadId = result.body.match(/<UploadId>([^<]+)<\/UploadId>/)?.[1];
    expect(uploadId).toBeTruthy();
    return uploadId as string;
  };

  const putPart = async (
    uploadId: string,
    partNumber: number,
    body: Buffer,
  ) => {
    const query = { partNumber: String(partNumber), uploadId };
    const headers = signHeaders({ method: 'PUT', path: PATH, query });
    return request(app, {
      method: 'PUT',
      path: `${PATH}?partNumber=${partNumber}&uploadId=${uploadId}`,
      headers,
      body,
    });
  };

  it('rejects unsigned PUT', async () => {
    findJamRecording.mockResolvedValue({
      id: RECORDING_ID,
      status: 'active',
      post: { data: { name: 'Jam' } },
      profile: { id: 'p1' },
    });

    const result = await request(app, {
      method: 'PUT',
      path: PATH,
      body: Buffer.from('video'),
    });
    expect(result.status).toBe(403);
    expect(completeJamRecording).not.toHaveBeenCalled();
  });

  it('accepts multipart complete after the recording is finalizing', async () => {
    const uploadId = await initiateMultipart();
    expect(await putPart(uploadId, 1, Buffer.from('hello'))).toMatchObject({
      status: 200,
    });
    findJamRecording.mockResolvedValue({
      ...activeRecording(),
      status: 'finalizing',
    });
    completeJamRecording.mockResolvedValue({
      ...activeRecording(),
      status: 'completed',
    });
    const headers = signHeaders({
      method: 'POST',
      path: PATH,
      query: { uploadId },
    });

    const result = await request(app, {
      method: 'POST',
      path: `${PATH}?uploadId=${uploadId}`,
      headers,
    });
    expect(result.status).toBe(200);
    expect(completeJamRecording).toHaveBeenCalledOnce();
    expect(failJamRecording).not.toHaveBeenCalled();
  });

  it('rejects overwrite of completed recordings', async () => {
    findJamRecording.mockResolvedValue({
      id: RECORDING_ID,
      status: 'completed',
      post: { data: { name: 'Jam' } },
      profile: { id: 'p1' },
    });
    const headers = signHeaders({ method: 'PUT', path: PATH, query: {} });

    const result = await request(app, {
      method: 'PUT',
      path: PATH,
      headers,
      body: Buffer.from('video'),
    });
    expect(result.status).toBe(409);
    expect(completeJamRecording).not.toHaveBeenCalled();
  });

  it('accepts signed PUT for active recordings', async () => {
    const recording = {
      id: RECORDING_ID,
      status: 'active',
      post: { id: 'post1', data: { name: 'Jam' } },
      profile: { id: 'p1' },
    };
    findJamRecording.mockResolvedValue(recording);
    completeJamRecording.mockResolvedValue(recording);
    finishRecording.mockResolvedValue(undefined);
    const headers = signHeaders({ method: 'PUT', path: PATH, query: {} });

    const result = await request(app, {
      method: 'PUT',
      path: PATH,
      headers,
      body: Buffer.from('video'),
    });
    expect(result.status).toBe(200);
    expect(completeJamRecording).toHaveBeenCalledOnce();
  });

  it('refuses multipart initiate without an acceptable recording', async () => {
    findJamRecording.mockResolvedValue(undefined);
    const headers = signHeaders({
      method: 'POST',
      path: PATH,
      query: { uploads: '' },
    });

    const result = await request(app, {
      method: 'POST',
      path: `${PATH}?uploads`,
      headers,
    });
    expect(result.status).toBe(404);
    expect(_s3Test.multipartUploads.size).toBe(0);
  });

  it('refuses part PUT for unknown uploadId', async () => {
    findJamRecording.mockResolvedValue({
      id: RECORDING_ID,
      status: 'active',
      post: { data: { name: 'Jam' } },
      profile: { id: 'p1' },
    });
    const query = { partNumber: '1', uploadId: 'missing-upload' };
    const headers = signHeaders({
      method: 'PUT',
      path: PATH,
      query,
    });

    const result = await request(app, {
      method: 'PUT',
      path: `${PATH}?partNumber=1&uploadId=missing-upload`,
      headers,
      body: Buffer.from('part'),
    });
    expect(result.status).toBe(404);
  });

  it('streams a completed multipart upload from disk', async () => {
    const uploadId = await initiateMultipart();
    expect(await putPart(uploadId, 1, Buffer.from('hello'))).toMatchObject({
      status: 200,
    });
    expect(await putPart(uploadId, 2, Buffer.from('world'))).toMatchObject({
      status: 200,
    });
    completeJamRecording.mockResolvedValue(activeRecording());
    const headers = signHeaders({
      method: 'POST',
      path: PATH,
      query: { uploadId },
    });

    const result = await request(app, {
      method: 'POST',
      path: `${PATH}?uploadId=${uploadId}`,
      headers,
    });
    expect(result.status).toBe(200);
    expect(storeFromPath).toHaveBeenCalledOnce();
    expect(completeJamRecording).toHaveBeenCalledOnce();
    expect(failJamRecording).not.toHaveBeenCalled();
    expect(_s3Test.multipartUploads.size).toBe(0);
  });

  it('marks the recording failed and keeps parts when complete fails', async () => {
    storeFromPath.mockRejectedValue(new Error('disk full'));
    const uploadId = await initiateMultipart();
    const tempDir = _s3Test.multipartUploads.get(uploadId)?.tempDir;
    expect(tempDir).toBeTruthy();
    leakedDirs.push(tempDir as string);
    expect(await putPart(uploadId, 1, Buffer.from('hello'))).toMatchObject({
      status: 200,
    });
    const headers = signHeaders({
      method: 'POST',
      path: PATH,
      query: { uploadId },
    });

    const result = await request(app, {
      method: 'POST',
      path: `${PATH}?uploadId=${uploadId}`,
      headers,
    });
    expect(result.status).toBe(500);
    expect(failJamRecording).toHaveBeenCalledWith(RECORDING_ID);
    expect(completeJamRecording).not.toHaveBeenCalled();
    expect(_s3Test.multipartUploads.size).toBe(0);
    expect(existsSync(join(tempDir as string, 'part-1'))).toBe(true);
  });

  it('marks the recording failed and keeps parts when the upload exceeds the cap', async () => {
    const uploadId = await initiateMultipart();
    const tempDir = _s3Test.multipartUploads.get(uploadId)?.tempDir;
    expect(tempDir).toBeTruthy();
    leakedDirs.push(tempDir as string);
    expect(await putPart(uploadId, 1, Buffer.from('hello'))).toMatchObject({
      status: 200,
    });
    _s3Test.setMaxUploadBytes(8);

    const result = await putPart(uploadId, 2, Buffer.from('world!!!'));
    expect(result.status).toBe(413);
    expect(failJamRecording).toHaveBeenCalledWith(RECORDING_ID);
    expect(_s3Test.multipartUploads.size).toBe(0);
    expect(existsSync(join(tempDir as string, 'part-1'))).toBe(true);
  });

  it('does not fail the recording when concurrent upload data is over cap', async () => {
    const uploadId = await initiateMultipart();
    expect(await putPart(uploadId, 1, Buffer.from('hello'))).toMatchObject({
      status: 200,
    });
    _s3Test.setMaxConcurrentMultipartBytes(6);

    const result = await putPart(uploadId, 2, Buffer.from('world'));
    expect(result.status).toBe(413);
    expect(result.body).toMatch(/concurrent/i);
    expect(failJamRecording).not.toHaveBeenCalled();
    expect(_s3Test.multipartUploads.size).toBe(1);
  });

  it('keeps parts and fails the recording on abort', async () => {
    const uploadId = await initiateMultipart();
    const tempDir = _s3Test.multipartUploads.get(uploadId)?.tempDir;
    expect(tempDir).toBeTruthy();
    leakedDirs.push(tempDir as string);
    expect(await putPart(uploadId, 1, Buffer.from('hello'))).toMatchObject({
      status: 200,
    });
    const headers = signHeaders({
      method: 'DELETE',
      path: PATH,
      query: { uploadId },
    });

    const result = await request(app, {
      method: 'DELETE',
      path: `${PATH}?uploadId=${uploadId}`,
      headers,
    });
    expect(result.status).toBe(204);
    expect(failJamRecording).toHaveBeenCalledWith(RECORDING_ID);
    expect(_s3Test.multipartUploads.size).toBe(0);
    expect(existsSync(join(tempDir as string, 'part-1'))).toBe(true);
  });

  it('marks the recording failed when a single PUT cannot be stored', async () => {
    storeFromPath.mockImplementation(async (filePath: string) => {
      leakedDirs.push(filePath);
      throw new Error('disk full');
    });
    findJamRecording.mockResolvedValue(activeRecording());
    const headers = signHeaders({ method: 'PUT', path: PATH, query: {} });

    const result = await request(app, {
      method: 'PUT',
      path: PATH,
      headers,
      body: Buffer.from('video'),
    });
    expect(result.status).toBe(500);
    expect(failJamRecording).toHaveBeenCalledWith(RECORDING_ID);
    expect(completeJamRecording).not.toHaveBeenCalled();
  });

  it('caps a single recording at 1.5GiB', () => {
    expect(_s3Test.DEFAULT_MAX_UPLOAD_BYTES).toBe(
      Math.floor(1.5 * 1024 * 1024 * 1024),
    );
  });
});
