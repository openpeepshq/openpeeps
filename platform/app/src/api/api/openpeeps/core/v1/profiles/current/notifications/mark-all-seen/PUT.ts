import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureLocalProfile } from '$lib/server/auth';
import { successResponseSchema } from '@openpeeps/common/types';
import { setAllSeen } from '@openpeeps/core/notifications';

export const Output = successResponseSchema;

export default new Endpoint({ Output }).handle(
  async (_, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    await setAllSeen(currentProfile);

    return {
      success: true,
    };
  },
);
