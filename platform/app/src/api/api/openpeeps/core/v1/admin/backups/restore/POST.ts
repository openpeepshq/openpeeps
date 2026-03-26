import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden, badRequest } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { restoreBackups } from '@openpeeps/core/backups';
import { successResponseSchema } from '@openpeeps/common/types';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createWriteStream } from 'node:fs';
import { pipeline } from 'node:stream/promises';
import { uuidv7 } from 'uuidv7';

export const Input = z.object({
});

export const Output = successResponseSchema;
export const Error = {
  403: forbidden(),
  400: badRequest(),
};

export default new Endpoint({ Input, Error, Output }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-backups-restore']);

    if (!event.request.body) {
      throw badRequest('No file stream detected in the request body.');
    }

    const restoreFileName = 'allpeep-restore-' + uuidv7();
    const destPath = join(tmpdir(), restoreFileName);

    const writeStream = createWriteStream(destPath);
    await pipeline(event.request.body as any, writeStream);

    await restoreBackups(restoreFileName);

    setTimeout(() => {
      console.log('Restarting server after successful restore...');
      process.exit(0);
    }, 5000);

    return Output.parse({ success: true });
  },
);
