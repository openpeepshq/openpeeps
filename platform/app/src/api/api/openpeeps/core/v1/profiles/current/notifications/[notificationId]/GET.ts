import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { expandedNotificationSchema } from '@openpeeps/common/types';
import { ensureLocalProfile } from '$lib/server/auth';
import { findNotification } from '@openpeeps/core/notifications';
import { notFound, forbidden } from '$lib/server/api/errors';

export const Output = expandedNotificationSchema;
export const Param = z.object({
  notificationId: z.string(),
});
export const Error = {
  404: notFound(),
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const notification = await findNotification(await ensureLocalProfile(event), input.notificationId);

    if (!notification) {
      throw notFound();
    }

    return notification;
  },
);
