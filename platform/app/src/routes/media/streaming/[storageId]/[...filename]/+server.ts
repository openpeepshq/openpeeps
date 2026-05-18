import type { RequestHandler } from '@sveltejs/kit';
import fs from 'node:fs/promises';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { Readable } from 'node:stream';
import mime from 'mime-types';
import { notFound } from '$lib/server/helpers';
import { getStreamDir, resolveStreamFile } from '@openpeeps/core/media';

// Range header support — HLS players issue range requests against segments to
// implement seeking. Without this they fall back to full-segment downloads
// which works but wastes bandwidth.
const parseRange = (
  rangeHeader: string | null,
  size: number,
): { start: number; end: number } | null => {
  if (!rangeHeader) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(rangeHeader.trim());
  if (!match) return null;
  const [, startStr, endStr] = match;
  let start = startStr ? Number(startStr) : NaN;
  let end = endStr ? Number(endStr) : NaN;
  if (Number.isNaN(start) && Number.isNaN(end)) return null;
  if (Number.isNaN(start)) {
    // suffix range: "bytes=-N" → last N bytes
    start = Math.max(0, size - end);
    end = size - 1;
  } else if (Number.isNaN(end)) {
    end = size - 1;
  }
  if (start < 0 || end >= size || start > end) return null;
  return { start, end };
};

const contentTypeFor = (filename: string): string => {
  if (filename.endsWith('.m3u8')) {
    return 'application/vnd.apple.mpegurl';
  }
  if (filename.endsWith('.ts')) {
    return 'video/mp2t';
  }
  return mime.contentType(filename) || 'application/octet-stream';
};

export const GET: RequestHandler = async ({
  params: { storageId, filename },
  request,
}) => {
  if (!storageId || !filename) {
    return notFound();
  }

  const streamDir = await getStreamDir(storageId);
  const filePath = resolveStreamFile(streamDir, filename);
  if (!filePath) {
    return notFound();
  }

  let fileStat: Awaited<ReturnType<typeof stat>>;
  try {
    fileStat = await stat(filePath);
  } catch {
    return notFound();
  }
  if (!fileStat.isFile()) {
    return notFound();
  }

  const contentType = contentTypeFor(filename);
  const commonHeaders: Record<string, string> = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
  };

  // Playlists are short and change semantics over time (during processing the
  // master playlist appears mid-flight); segments are long-lived and content
  // addressed by name within the stream dir, so cache them aggressively.
  if (filename.endsWith('.m3u8')) {
    commonHeaders['Cache-Control'] = 'no-cache';
  } else {
    commonHeaders['Cache-Control'] = 'public, max-age=31536000, immutable';
  }

  const range = parseRange(request.headers.get('range'), fileStat.size);
  if (range) {
    const { start, end } = range;
    const length = end - start + 1;
    const nodeStream = createReadStream(filePath, { start, end });
    return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
      status: 206,
      headers: {
        ...commonHeaders,
        'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
        'Content-Length': String(length),
      },
    });
  }

  // For small playlists, read fully into memory so we can set Content-Length
  // and avoid the extra streaming machinery. For large segment files use a
  // streaming response to keep memory bounded.
  if (filename.endsWith('.m3u8') && fileStat.size < 1024 * 1024) {
    const body = await fs.readFile(filePath);
    return new Response(body, {
      headers: {
        ...commonHeaders,
        'Content-Length': String(fileStat.size),
      },
    });
  }

  const nodeStream = createReadStream(filePath);
  return new Response(Readable.toWeb(nodeStream) as ReadableStream, {
    headers: {
      ...commonHeaders,
      'Content-Length': String(fileStat.size),
    },
  });
};
