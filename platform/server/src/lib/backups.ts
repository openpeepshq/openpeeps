import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import type { Express, Request, Response } from 'express';
import type { Authorization } from '@openpeeps/common/types';
import { checkRoleCapabilities } from '@openpeeps/common/lib';
import {
  downloadBackup,
  listAllBackups,
} from '@openpeeps/core/backups';
import { jwtUtil } from '@openpeeps/core/jwt';
import { findProfile } from '@openpeeps/core/profiles';
import { logger } from '@openpeeps/core/log';

const log = logger('server:backups');

// Serves backup archives at `/backups/<name>.zip` with streaming and
// Content-Length so the browser download manager starts immediately.
// Mirrors the SvelteKit handler at
// `platform/app/src/routes/backups/[backupDir].zip/+server.ts`, but adds
// auth (Bearer header or `?token=` for navigation-based downloads).

const readToken = (req: Request): string | undefined => {
  const bearer = req.headers.authorization?.match(/^Bearer (.+)$/)?.[1];
  if (bearer) return bearer;
  const queryToken = req.query.token;
  return typeof queryToken === 'string' ? queryToken : undefined;
};

const authorizeBackupDownload = async (
  req: Request,
  res: Response,
): Promise<boolean> => {
  const token = readToken(req);
  if (!token) {
    res.status(401).send('Unauthorized');
    return false;
  }

  const jwt = await jwtUtil();
  const verified = await jwt.verify(token);
  const authorization = verified?.payload as Authorization | undefined;
  const profileId = authorization?.identities.profile;
  if (!profileId) {
    res.status(401).send('Unauthorized');
    return false;
  }

  const profile = await findProfile(profileId);
  if (!profile || profile.deletedAt) {
    res.status(403).send('Forbidden');
    return false;
  }

  const { success } = checkRoleCapabilities(profile.roles, [
    'core-backups-download',
  ]);
  if (!success) {
    res.status(403).send('Forbidden');
    return false;
  }

  return true;
};

const handleBackupDownload = async (req: Request, res: Response) => {
  if (!(await authorizeBackupDownload(req, res))) return;

  const rawName = req.params.name;
  if (
    !rawName ||
    rawName.includes('/') ||
    rawName.includes('\\') ||
    rawName.includes('..')
  ) {
    res.status(404).send('Not found');
    return;
  }

  const backups = await listAllBackups();
  if (!backups.includes(rawName)) {
    res.status(404).send('Not found');
    return;
  }

  const backupZip = await downloadBackup(rawName);
  let fileStat: Awaited<ReturnType<typeof stat>>;
  try {
    fileStat = await stat(backupZip);
    if (!fileStat.isFile()) {
      res.status(404).send('Not found');
      return;
    }
  } catch {
    res.status(404).send('Not found');
    return;
  }

  res.set({
    'Content-Type': 'application/zip',
    'Content-Disposition': `attachment; filename="${rawName}.zip"`,
    'Content-Length': String(fileStat.size),
    'Cache-Control': 'private, no-store',
  });

  createReadStream(backupZip).pipe(res);
};

export const installBackupsEndpoint = (app: Express) => {
  app.get('/backups/:name.zip', (req, res) => {
    handleBackupDownload(req, res).catch((err) => {
      log.error('backups: unhandled error', err);
      if (!res.headersSent) res.status(500).send('Internal server error');
    });
  });
};
