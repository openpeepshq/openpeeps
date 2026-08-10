import { createHash, createHmac } from 'node:crypto';
import http from 'node:http';
import net from 'node:net';
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
  finishRecording,
  jamRecordingUploadSecret,
} = vi.hoisted(() => {
  const apiSecret = 'test-livekit-api-secret';
  const derive = (recordingId: string) =>
    createHmac('sha256', apiSecret)
      .update(`jam-recording-upload:${recordingId}`)
      .digest('hex');
  return {
    findJamRecording: vi.fn(),
    completeJamRecording: vi.fn(),
    finishRecording: vi.fn(),
    jamRecordingUploadSecret: vi.fn(async (id: string) => derive(id)),
  };
});

vi.mock('@openpeepshq/core/jams', () => ({
  findJamRecording: (id: string) => findJamRecording(id),
  completeJamRecording: (id: string, attachment: unknown) =>
    completeJamRecording(id, attachment),
  finishRecording: (recording: unknown) => finishRecording(recording),
  jamRecordingUploadSecret: (id: string) => jamRecordingUploadSecret(id),
}));

vi.mock('@openpeepshq/core/media', () => ({
  mediaStorage: async () => ({
    store: async () => 'stored-key',
    getPath: (key: string, name: string) => `/media/${key}/${name}`,
  }),
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
    method: 'PUT' | 'POST';
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

describe('installS3Endpoint', () => {
  let app: express.Express;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(Date.UTC(2026, 7, 9, 12, 0, 0)));
    findJamRecording.mockReset();
    completeJamRecording.mockReset();
    finishRecording.mockReset();
    jamRecordingUploadSecret.mockClear();
    app = express();
    installS3Endpoint(app);
  });

  afterEach(async () => {
    for (const uploadId of [..._s3Test.multipartUploads.keys()]) {
      await _s3Test.cleanupMultipartUpload(uploadId);
    }
    vi.useRealTimers();
  });

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
});
