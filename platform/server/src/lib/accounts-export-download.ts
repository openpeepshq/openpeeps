import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { Express, Request, Response } from 'express';
import {
  resolveDownloadByToken,
  invalidateToken,
} from '@openpeepshq/core/accounts';
import { logger } from '@openpeepshq/core/log';

const log = logger('server:accounts:exportDownload');

// Serves assembled personal-data export archives at
// `/api/openpeeps/core/v1/accounts/current/export/download?token=<one-time>`.
//
// The token is the sole credential — intentionally token-only (no session
// check): the token is a 128-bit random single-use value with a 7-day TTL, so
// its secrecy is equivalent to a session. This mirrors the existing
// `/backups/*.zip?token=` flow. The download route is a plain express handler
// registered before the Riddl delegation, so it sits outside Riddl's
// auth-extraction pipeline (where a session could be read cheaply); keeping
// the token-only contract avoids duplicating session/auth logic here.
const handleExportDownload = async (req: Request, res: Response) => {
  const rawToken = req.query.token;
  const token = typeof rawToken === 'string' ? rawToken : undefined;
  if (!token) {
    res.status(401).send('Unauthorized');
    return;
  }

  const record = await resolveDownloadByToken(token);
  if (!record) {
    res.status(410).send('Export not available');
    return;
  }

  let fileStat: Awaited<ReturnType<typeof stat>>;
  try {
    fileStat = await stat(record.path!);
    if (!fileStat.isFile()) {
      res.status(410).send('Export not available');
      return;
    }
  } catch {
    res.status(410).send('Export not available');
    return;
  }

  res.set({
    'Content-Type': 'application/zip',
    // One static name for every platform: web (the hook's blob download) and
    // RN (external handler) must hand the user the same file. Keep in sync
    // with `EXPORT_FILENAME` in the shared `useAccountExport` hook.
    'Content-Disposition':
      'attachment; filename="openpeeps-account-export.zip"',
    'Content-Length': String(fileStat.size),
    'Cache-Control': 'private, no-store',
  });

  const stream = createReadStream(record.path!);
  // One-time link: the token is burned only once the response has fully
  // finished, so a client that aborts mid-transfer keeps a working token and
  // can retry (the previous implementation invalidated before piping, which
  // burned the user's only download on any interrupted transfer).
  res.on('finish', () => {
    void invalidateToken(token);
  });
  // Client aborted before the body was sent: stop reading the file (no leak),
  // but leave the token valid so the download can be retried. A disconnect
  // fires on both `req` and `res`; guarding on `res.writableEnded` keeps this
  // a no-op after a normal finish, and a client that aborts between headers and
  // the first chunk still stops the read.
  req.on('close', () => {
    if (!res.writableEnded) stream.destroy();
  });
  res.on('close', () => {
    if (!res.writableEnded) stream.destroy();
  });
  stream.on('error', (err) => {
    log.error('account export download: stream error', err);
    if (!res.headersSent) res.status(500).send('Internal server error');
    else res.end();
  });
  stream.pipe(res);
};

export const installAccountExportDownloadEndpoint = (app: Express) => {
  app.get(
    '/api/openpeeps/core/v1/accounts/current/export/download',
    (req, res) => {
      handleExportDownload(req, res).catch((err) => {
        log.error('account export download: unhandled error', err);
        if (!res.headersSent) res.status(500).send('Internal server error');
      });
    },
  );
};
