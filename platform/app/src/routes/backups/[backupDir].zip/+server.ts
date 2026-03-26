import type { RequestHandler } from '@sveltejs/kit';
import { downloadBackup } from '@openpeeps/core/backups';
import { Readable } from 'node:stream';
import fs from 'node:fs';

export const GET: RequestHandler = async ({ params: { backupDir } }) =>
  await downloadBackup(backupDir as string).then((backupZip) => {
    const fileStream = Readable.toWeb(
      fs.createReadStream(backupZip),
    ) as BodyInit;
    return new Response(fileStream);
  });
