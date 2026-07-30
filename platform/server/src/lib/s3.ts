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
} from '@openpeeps/core/jams';
import { logger } from '@openpeeps/core/log';
import { mediaStorage } from '@openpeeps/core/media';
import { createMediaAttachment } from '@openpeeps/core/mediaAttachments';
import { serverRootUrl } from '@openpeeps/core/server';

const log = logger('server:s3');

// LiveKit egress uploads jam recordings to an S3-compatible endpoint. Speaks
// just enough of the S3 multipart protocol for the egress uploader.

interface MultipartUploadState {
  uploadId: string;
  bucket: string;
  filename: string;
  parts: Map<number, { etag: string; size: number }>;
  tempDir: string;
}

const multipartUploads = new Map<string, MultipartUploadState>();

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

const processCompleteFile = async (
  blob: Blob,
  recordingId: string,
  recording: JamRecordingWithMeta,
) => {
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

// Upload a single part (multipart) or a complete small object.
const handlePut = async (req: Request, res: Response) => {
  const { bucket, filename } = req.params as {
    bucket: string;
    filename: string;
  };
  const partNumber = req.query.partNumber as string | undefined;
  const uploadId = req.query.uploadId as string | undefined;
  const blob = readObjectBody(req);

  if (partNumber && uploadId) {
    const partNum = parseInt(partNumber, 10);
    if (Number.isNaN(partNum) || partNum < 1) {
      res.status(400).send('Invalid partNumber');
      return;
    }

    let state = multipartUploads.get(uploadId);
    if (!state) {
      const uploadTempDir = join(await getMultipartTempDir(), uploadId);
      await mkdir(uploadTempDir, { recursive: true });
      state = {
        uploadId,
        bucket,
        filename,
        parts: new Map(),
        tempDir: uploadTempDir,
      };
      multipartUploads.set(uploadId, state);
    }

    const chunkData = await blob.arrayBuffer();
    await writeFile(
      join(state.tempDir, `part-${partNum}`),
      new Uint8Array(chunkData),
    );
    const etag = generateETag(chunkData);
    state.parts.set(partNum, { etag, size: chunkData.byteLength });

    res.set('ETag', etag).status(200).send('');
    return;
  }

  if (bucket === 'allpeep-recordings') {
    if (filename?.endsWith('.mp4')) {
      const recordingId = filename.replace('.mp4', '');
      const recording = await findJamRecording(recordingId);
      if (!recording) {
        res.status(404).send(`Recording with id ${recordingId} not found`);
        return;
      }
      await processCompleteFile(blob, recordingId, recording);
      res.json({ success: true });
      return;
    }
    if (filename?.endsWith('.json')) {
      res.json({ success: true });
      return;
    }
  }

  res.status(404).send('Not found');
};

// Initiate a multipart upload (`?uploads`) or complete one (`?uploadId=...`).
const handlePost = async (req: Request, res: Response) => {
  const { bucket, filename } = req.params as {
    bucket: string;
    filename: string;
  };
  const uploadId = req.query.uploadId as string | undefined;
  const uploads = req.query.uploads;

  if (uploads !== undefined && !uploadId) {
    const newUploadId = randomUUID();
    const uploadTempDir = join(await getMultipartTempDir(), newUploadId);
    await mkdir(uploadTempDir, { recursive: true });

    multipartUploads.set(newUploadId, {
      uploadId: newUploadId,
      bucket,
      filename,
      parts: new Map(),
      tempDir: uploadTempDir,
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
      res.status(404).send('UploadId not found');
      return;
    }

    const partNumbers = Array.from(state.parts.keys()).sort((a, b) => a - b);
    const hasAllParts = partNumbers.every((num, i) => num === i + 1);
    if (!hasAllParts) {
      res.status(400).send('Missing parts');
      return;
    }

    const chunks: Uint8Array[] = [];
    for (const partNum of partNumbers) {
      const data = await readFile(join(state.tempDir, `part-${partNum}`));
      chunks.push(new Uint8Array(data));
    }
    const finalBlob = new Blob(chunks);

    if (state.bucket === 'allpeep-recordings' && filename?.endsWith('.mp4')) {
      const recordingId = filename.replace('.mp4', '');
      const recording = await findJamRecording(recordingId);
      if (!recording) {
        await cleanupMultipartUpload(uploadId);
        res.status(404).send(`Recording with id ${recordingId} not found`);
        return;
      }

      await processCompleteFile(finalBlob, recordingId, recording);
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

    await cleanupMultipartUpload(uploadId);
    res.status(404).send('Not found');
    return;
  }

  res.status(400).send('Invalid request');
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
