import { createHash, randomUUID } from 'node:crypto';
import {
  mkdir,
  readdir,
  readFile,
  rmdir,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import express, { type Express, type Request, type Response } from 'express';
import type { Event, JamRecordingWithMeta } from '@openpeeps/common';
import {
  completeJamRecording,
  findJamRecording,
  finishRecording,
  jamRecordingUploadSecret,
} from '@openpeeps/core/jams';
import { logger } from '@openpeeps/core/log';
import { mediaStorage } from '@openpeeps/core/media';
import { createMediaAttachment } from '@openpeeps/core/mediaAttachments';
import { serverRootUrl } from '@openpeeps/core/server';
import { verifyAwsSigV4 } from './s3SigV4';

const log = logger('server:s3');

// LiveKit egress uploads jam recordings to an S3-compatible endpoint. Speaks
// just enough of the S3 multipart protocol for the egress uploader.

const RECORDINGS_BUCKET = 'allpeep-recordings';
/** Cap for one multipart upload (matches express.raw limit). */
const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024;
/** Cap for all in-flight multipart temp data combined. */
const MAX_CONCURRENT_MULTIPART_BYTES = 2 * 1024 * 1024 * 1024;

interface MultipartUploadState {
  uploadId: string;
  bucket: string;
  filename: string;
  recordingId: string;
  parts: Map<number, { etag: string; size: number }>;
  tempDir: string;
  totalBytes: number;
}

const multipartUploads = new Map<string, MultipartUploadState>();

const concurrentMultipartBytes = () =>
  Array.from(multipartUploads.values()).reduce(
    (sum, state) => sum + state.totalBytes,
    0,
  );

const getMultipartTempDir = async () => {
  const dir = join(tmpdir(), 's3-multipart');
  await mkdir(dir, { recursive: true });
  return dir;
};

const generateETag = (data: ArrayBuffer): string =>
  `"${createHash('md5').update(new Uint8Array(data)).digest('hex')}"`;

// AWS streaming uploads wrap the payload in `<hex-size>\r\n<bytes>\r\n` frames.
// Strip those frames to recover the original object bytes.
const decodeAwsChunked = (
  chunkedBuf: ArrayBuffer,
  plainSize: number = Number.MAX_SAFE_INTEGER,
): ArrayBuffer => {
  const view = new Uint8Array(chunkedBuf);
  const out = new Uint8Array(plainSize);
  let outPos = 0;

  const readLine = (start: number): { line: string; nextIdx: number } => {
    for (let i = start; i + 1 < view.length; i++) {
      if (view[i] === 0x0d && view[i + 1] === 0x0a) {
        return {
          line: new TextDecoder().decode(view.subarray(start, i)),
          nextIdx: i + 2,
        };
      }
    }
    throw new Error('Malformed aws-chunked data – missing CRLF');
  };

  let idx = 0;
  while (idx < view.length) {
    const { line: header, nextIdx } = readLine(idx);
    idx = nextIdx;

    const semiPos = header.indexOf(';');
    const sizeHex = semiPos === -1 ? header : header.substring(0, semiPos);
    const chunkSize = parseInt(sizeHex, 16);
    if (Number.isNaN(chunkSize)) {
      throw new Error(`Invalid chunk size "${sizeHex}"`);
    }

    if (chunkSize === 0) {
      idx = readLine(idx).nextIdx;
      break;
    }

    if (idx + chunkSize > view.length) {
      throw new Error('Chunk data exceeds supplied buffer length');
    }

    const toCopy = Math.min(chunkSize, plainSize - outPos);
    out.set(view.subarray(idx, idx + toCopy), outPos);
    outPos += toCopy;
    idx += chunkSize;

    if (outPos >= plainSize) {
      idx = readLine(idx).nextIdx;
      break;
    }
    idx = readLine(idx).nextIdx;
  }

  return out.subarray(0, outPos).buffer;
};

// Turn an Express raw body into the object bytes, decoding aws-chunked framing
// when the egress uploader used streaming signatures.
const readObjectBody = (req: Request): Blob => {
  const body: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
  // Buffers are always backed by a (non-shared) ArrayBuffer; copy out the
  // exact view so downstream consumers get a plain ArrayBuffer.
  const ab = body.buffer.slice(
    body.byteOffset,
    body.byteOffset + body.byteLength,
  ) as ArrayBuffer;
  if (req.headers['content-encoding'] === 'aws-chunked') {
    const decodedLength = Number(req.headers['x-amz-decoded-content-length']);
    return new Blob([decodeAwsChunked(ab, decodedLength)]);
  }
  return new Blob([ab]);
};

const recordingIdFromFilename = (filename: string): string | undefined => {
  const match = filename.match(/^(.+)\.(mp4|json)$/);
  return match?.[1];
};

const requestPath = (req: Request): string => {
  const pathOnly = req.originalUrl.split('?')[0] ?? req.path;
  return pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
};

const authorizeRecordingRequest = async (
  req: Request,
  recordingId: string,
): Promise<{ ok: true } | { ok: false; status: number; message: string }> => {
  let secret: string;
  try {
    secret = await jamRecordingUploadSecret(recordingId);
  } catch (err) {
    log.error('s3: upload secret unavailable', err);
    return { ok: false, status: 503, message: 'Upload auth unavailable' };
  }

  const verified = verifyAwsSigV4(
    {
      method: req.method,
      path: requestPath(req),
      query: req.query as Record<string, string | string[] | undefined>,
      headers: req.headers as Record<string, string | string[] | undefined>,
      body: Buffer.isBuffer(req.body) ? req.body : undefined,
    },
    recordingId,
    secret,
    { expectedSessionToken: recordingId },
  );

  if (!verified.ok) {
    log.warn(`s3: auth rejected (${verified.reason}) for ${recordingId}`);
    return { ok: false, status: 403, message: 'Forbidden' };
  }
  return { ok: true };
};

const loadAcceptableRecording = async (
  recordingId: string,
): Promise<
  | { ok: true; recording: JamRecordingWithMeta }
  | { ok: false; status: number; message: string }
> => {
  const recording = await findJamRecording(recordingId);
  if (!recording) {
    return {
      ok: false,
      status: 404,
      message: `Recording with id ${recordingId} not found`,
    };
  }
  if (recording.status !== 'requested' && recording.status !== 'active') {
    return {
      ok: false,
      status: 409,
      message: `Recording status ${recording.status} does not accept uploads`,
    };
  }
  return { ok: true, recording };
};

const processCompleteFile = async (
  blob: Blob,
  recordingId: string,
  recording: JamRecordingWithMeta,
) => {
  // Re-check immediately before mutating so completed/failed rows cannot be
  // overwritten by a racing second upload.
  const gate = await loadAcceptableRecording(recordingId);
  if (!gate.ok) {
    throw Object.assign(new Error(gate.message), { status: gate.status });
  }

  const event = recording.post.data as Event;
  const newFilename = `${encodeURIComponent(event.name || 'jam-recording')}.mp4`;
  const file = new File([blob], newFilename, { type: 'video/mp4' });
  const storage = await mediaStorage();
  const fileStorageKey = await file.arrayBuffer().then(storage.store);
  const mediaAttachment = await createMediaAttachment({
    url: storage.getPath(fileStorageKey, newFilename),
    previewUrl: event.image ?? `${await serverRootUrl()}/img/event-default.png`,
    textUrl: null,
    filename: newFilename,
    type: 'video',
    meta: { usage: 'jam-recording' },
    description: event.name || 'jam-recording',
  });
  await completeJamRecording(recordingId, mediaAttachment);

  await finishRecording(recording);
};

const cleanupMultipartUpload = async (uploadId: string) => {
  const state = multipartUploads.get(uploadId);
  if (!state) return;
  try {
    for (const file of await readdir(state.tempDir)) {
      await unlink(join(state.tempDir, file));
    }
    await rmdir(state.tempDir);
  } catch (err) {
    log.error(`Error cleaning up multipart upload ${uploadId}:`, err);
  }
  multipartUploads.delete(uploadId);
};

const sendXml = (res: Response, status: number, xml: string) =>
  res.status(status).type('application/xml').send(xml);

const reject = (res: Response, status: number, message: string) => {
  res.status(status).send(message);
};

// Upload a single part (multipart) or a complete small object.
const handlePut = async (req: Request, res: Response) => {
  const { bucket, filename } = req.params as {
    bucket: string;
    filename: string;
  };
  const partNumber = req.query.partNumber as string | undefined;
  const uploadId = req.query.uploadId as string | undefined;
  const recordingId = recordingIdFromFilename(filename);

  if (!recordingId || bucket !== RECORDINGS_BUCKET) {
    reject(res, 404, 'Not found');
    return;
  }

  const auth = await authorizeRecordingRequest(req, recordingId);
  if (!auth.ok) {
    reject(res, auth.status, auth.message);
    return;
  }

  if (partNumber && uploadId) {
    const partNum = parseInt(partNumber, 10);
    if (Number.isNaN(partNum) || partNum < 1) {
      reject(res, 400, 'Invalid partNumber');
      return;
    }

    const state = multipartUploads.get(uploadId);
    if (!state) {
      reject(res, 404, 'UploadId not found');
      return;
    }
    if (
      state.bucket !== bucket ||
      state.filename !== filename ||
      state.recordingId !== recordingId
    ) {
      reject(res, 403, 'Forbidden');
      return;
    }

    const blob = readObjectBody(req);
    const chunkData = await blob.arrayBuffer();
    const nextUploadBytes = state.totalBytes + chunkData.byteLength;
    if (nextUploadBytes > MAX_UPLOAD_BYTES) {
      await cleanupMultipartUpload(uploadId);
      reject(res, 413, 'Upload too large');
      return;
    }
    if (
      concurrentMultipartBytes() - state.totalBytes + nextUploadBytes >
      MAX_CONCURRENT_MULTIPART_BYTES
    ) {
      reject(res, 413, 'Too much concurrent upload data');
      return;
    }

    await writeFile(
      join(state.tempDir, `part-${partNum}`),
      new Uint8Array(chunkData),
    );
    const etag = generateETag(chunkData);
    const previous = state.parts.get(partNum);
    state.parts.set(partNum, { etag, size: chunkData.byteLength });
    state.totalBytes =
      state.totalBytes - (previous?.size ?? 0) + chunkData.byteLength;

    res.set('ETag', etag).status(200).send('');
    return;
  }

  if (filename.endsWith('.json')) {
    // LiveKit may probe/upload a manifest; nothing is persisted.
    res.json({ success: true });
    return;
  }

  if (filename.endsWith('.mp4')) {
    const gate = await loadAcceptableRecording(recordingId);
    if (!gate.ok) {
      reject(res, gate.status, gate.message);
      return;
    }
    try {
      await processCompleteFile(
        readObjectBody(req),
        recordingId,
        gate.recording,
      );
    } catch (err) {
      const status = (err as { status?: number }).status ?? 500;
      reject(res, status, (err as Error).message);
      return;
    }
    res.json({ success: true });
    return;
  }

  reject(res, 404, 'Not found');
};

// Initiate a multipart upload (`?uploads`) or complete one (`?uploadId=...`).
const handlePost = async (req: Request, res: Response) => {
  const { bucket, filename } = req.params as {
    bucket: string;
    filename: string;
  };
  const uploadId = req.query.uploadId as string | undefined;
  const uploads = req.query.uploads;
  const recordingId = recordingIdFromFilename(filename);

  if (!recordingId || bucket !== RECORDINGS_BUCKET) {
    reject(res, 404, 'Not found');
    return;
  }

  const auth = await authorizeRecordingRequest(req, recordingId);
  if (!auth.ok) {
    reject(res, auth.status, auth.message);
    return;
  }

  if (uploads !== undefined && !uploadId) {
    if (!filename.endsWith('.mp4')) {
      reject(res, 404, 'Not found');
      return;
    }

    const gate = await loadAcceptableRecording(recordingId);
    if (!gate.ok) {
      reject(res, gate.status, gate.message);
      return;
    }

    if (concurrentMultipartBytes() >= MAX_CONCURRENT_MULTIPART_BYTES) {
      reject(res, 413, 'Too much concurrent upload data');
      return;
    }

    const newUploadId = randomUUID();
    const uploadTempDir = join(await getMultipartTempDir(), newUploadId);
    await mkdir(uploadTempDir, { recursive: true });

    multipartUploads.set(newUploadId, {
      uploadId: newUploadId,
      bucket,
      filename,
      recordingId,
      parts: new Map(),
      tempDir: uploadTempDir,
      totalBytes: 0,
    });

    sendXml(
      res,
      200,
      `<?xml version="1.0" encoding="UTF-8"?>
<InitiateMultipartUploadResult>
    <Bucket>${bucket}</Bucket>
    <Key>${filename}</Key>
    <UploadId>${newUploadId}</UploadId>
</InitiateMultipartUploadResult>`,
    );
    return;
  }

  if (uploadId) {
    const state = multipartUploads.get(uploadId);
    if (!state) {
      reject(res, 404, 'UploadId not found');
      return;
    }
    if (
      state.bucket !== bucket ||
      state.filename !== filename ||
      state.recordingId !== recordingId
    ) {
      reject(res, 403, 'Forbidden');
      return;
    }

    const gate = await loadAcceptableRecording(recordingId);
    if (!gate.ok) {
      await cleanupMultipartUpload(uploadId);
      reject(res, gate.status, gate.message);
      return;
    }

    const partNumbers = Array.from(state.parts.keys()).sort((a, b) => a - b);
    const hasAllParts = partNumbers.every((num, i) => num === i + 1);
    if (!hasAllParts) {
      reject(res, 400, 'Missing parts');
      return;
    }

    const chunks: Uint8Array[] = [];
    for (const partNum of partNumbers) {
      const data = await readFile(join(state.tempDir, `part-${partNum}`));
      chunks.push(new Uint8Array(data));
    }
    const finalBlob = new Blob(chunks);

    try {
      await processCompleteFile(finalBlob, recordingId, gate.recording);
    } catch (err) {
      await cleanupMultipartUpload(uploadId);
      const status = (err as { status?: number }).status ?? 500;
      reject(res, status, (err as Error).message);
      return;
    }
    await cleanupMultipartUpload(uploadId);

    const url = new URL(req.originalUrl, await serverRootUrl());
    sendXml(
      res,
      200,
      `<?xml version="1.0" encoding="UTF-8"?>
<CompleteMultipartUploadResult>
    <Location>${url.origin}${url.pathname}</Location>
    <Bucket>${bucket}</Bucket>
    <Key>${filename}</Key>
</CompleteMultipartUploadResult>`,
    );
    return;
  }

  reject(res, 400, 'Invalid request');
};

export const installS3Endpoint = (app: Express) => {
  const raw = express.raw({ type: () => true, limit: '1024mb' });
  const wrap =
    (handler: (req: Request, res: Response) => Promise<void>) =>
    (req: Request, res: Response) => {
      handler(req, res).catch((err) => {
        log.error('s3: unhandled error', err);
        if (!res.headersSent) res.status(500).send('Internal server error');
      });
    };

  app.put('/s3/:bucket/:filename', raw, wrap(handlePut));
  app.post('/s3/:bucket/:filename', raw, wrap(handlePost));
};

/** Test helpers */
export const _s3Test = {
  MAX_UPLOAD_BYTES,
  MAX_CONCURRENT_MULTIPART_BYTES,
  multipartUploads,
  concurrentMultipartBytes,
  cleanupMultipartUpload,
};
