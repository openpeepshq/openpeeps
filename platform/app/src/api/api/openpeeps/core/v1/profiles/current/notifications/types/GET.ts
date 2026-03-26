import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { ensureLocalProfile } from '$lib/server/auth';
import { defaultNotificationTypes } from '@openpeeps/core/notifications';
import { forbidden } from '$lib/server/api/errors';
import { notificationTypeSchema } from '@openpeeps/common';

export const Output = notificationTypeSchema.array();

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureLocalProfile(event);

    return defaultNotificationTypes;

  },
);
