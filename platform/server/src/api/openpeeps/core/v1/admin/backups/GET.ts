import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { listAllBackups } from '@openpeepshq/core/backups';

export const Output = z.array(z.string());
export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-backups-read']);

    const backups = await listAllBackups();

    return Output.parse(backups);
  },
);
