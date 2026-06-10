import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { createBackup } from '@openpeeps/core/backups';

export const Output = z.object({
  success: z.boolean(),
  directory: z.string(),
});
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-backups-create']);

    const directoryName = await createBackup();

    return Output.parse({
      success: true,
      directory: directoryName,
    });
  },
);
