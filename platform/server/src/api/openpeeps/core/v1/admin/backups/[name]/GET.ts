import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { downloadBackup, listAllBackups } from '@openpeeps/core/backups';
import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { Readable } from 'node:stream';

export const Param = z.object({
  name: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Error }).handle(
  async (param, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-backups-download']);

    const { name } = param;
    if (name.includes('/') || name.includes('\\') || name.includes('..')) {
      throw notFound();
    }

    const backups = await listAllBackups();
    if (!backups.includes(name)) {
      throw notFound();
    }

    const backupZip = await downloadBackup(name);
    try {
      const fileStat = await stat(backupZip);
      if (!fileStat.isFile()) {
        throw notFound();
      }
    } catch {
      throw notFound();
    }

    const fileStream = Readable.toWeb(createReadStream(backupZip)) as BodyInit;
    return new Response(fileStream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${name}.zip"`,
      },
    });
  },
);
