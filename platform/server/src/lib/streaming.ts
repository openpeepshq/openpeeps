import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import type { Express, Request, Response } from 'express';
import { getStreamDir, resolveStreamFile } from '@openpeeps/core/media';
import { logger } from '@openpeeps/core/log';

const log = logger('server:streaming');

// Serves the HLS playlists and segments produced by the VOD transcoder at
// `/media/streaming/<storageId>/<file>`. This is the React-server port of the
// SvelteKit handler at
// `platform/app/src/routes/media/streaming/[storageId]/[...filename]/+server.ts`.
// `vodMasterPlaylistUrl` (in `@openpeeps/react`) points players here, so it must
// be registered before the SPA catch-all.

// HLS players issue range requests against segments to seek. Without this they
// fall back to full-segment downloads — functional but wasteful.
const parseRange = (
  rangeHeader: string | undefined,
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
    start = Math.max(0, size - end);
    end = size - 1;
  } else if (Number.isNaN(end)) {
    end = size - 1;
  }
  if (start < 0 || end >= size || start > end) return null;
  return { start, end };
};

const contentTypeFor = (filename: string): string => {
  if (filename.endsWith('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (filename.endsWith('.ts')) return 'video/mp2t';
  return '';
};

const handleStream = async (req: Request, res: Response) => {
  const storageId = req.params[0];
  const filename = req.params[1];
  if (!storageId || !filename) {
    res.status(404).send('Not found');
    return;
  }

  const streamDir = await getStreamDir(storageId);
  const filePath = resolveStreamFile(streamDir, filename);
  if (!filePath) {
    res.status(404).send('Not found');
    return;
  }

  let fileStat: Awaited<ReturnType<typeof stat>>;
  try {
    fileStat = await stat(filePath);
  } catch {
    res.status(404).send('Not found');
    return;
  }
  if (!fileStat.isFile()) {
    res.status(404).send('Not found');
    return;
  }

  const isPlaylist = filename.endsWith('.m3u8');
  const contentType = contentTypeFor(filename);
  res.set({
    'Accept-Ranges': 'bytes',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
    // Playlists change semantics during processing (the master playlist appears
    // mid-flight); segments are content-addressed and immutable.
    'Cache-Control': isPlaylist
      ? 'no-cache'
      : 'public, max-age=31536000, immutable',
  });
  if (contentType) res.type(contentType);
  else res.type(filename);

  const range = parseRange(req.headers.range, fileStat.size);
  if (range) {
    const { start, end } = range;
    res.status(206).set({
      'Content-Range': `bytes ${start}-${end}/${fileStat.size}`,
      'Content-Length': String(end - start + 1),
    });
    createReadStream(filePath, { start, end }).pipe(res);
    return;
  }

  // Small playlists: read fully so Content-Length is exact. Segments: stream to
  // keep memory bounded.
  if (isPlaylist && fileStat.size < 1024 * 1024) {
    const body = await readFile(filePath);
    res.set('Content-Length', String(fileStat.size)).send(body);
    return;
  }

  res.set('Content-Length', String(fileStat.size));
  createReadStream(filePath).pipe(res);
};

export const installStreamingEndpoint = (app: Express) => {
  // `<storageId>` is a single segment; the remainder is the (possibly nested)
  // file path within the stream dir. A RegExp route avoids Express 5 wildcard
  // param ambiguity; captures land in `req.params[0]` / `[1]`.
  app.get(/^\/media\/streaming\/([^/]+)\/(.+)$/, (req, res) => {
    handleStream(req, res).catch((err) => {
      log.error('streaming: unhandled error', err);
      if (!res.headersSent) res.status(500).send('Internal server error');
    });
  });
};
