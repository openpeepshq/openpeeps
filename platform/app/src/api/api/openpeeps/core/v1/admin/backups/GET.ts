import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { listAllBackups } from '@openpeeps/core/backups';

export const Output = z.array(z.string());
export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Error, Output }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-backups-read']);

    const backups = await listAllBackups();

    return Output.parse(backups);
  },
);
