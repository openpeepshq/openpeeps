import { Endpoint } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureLocalProfile } from '$lib/server/auth';
import { notificationStatsSchema } from '@openpeeps/common/types';
import { forbidden } from '$lib/server/api/errors';
import { getNotificationStats } from '@openpeeps/core/notifications';

export const Output = notificationStatsSchema;

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    return getNotificationStats(currentProfile);
  },
);
