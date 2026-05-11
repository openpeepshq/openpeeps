import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { expandedNotificationSchema } from '@openpeeps/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { findNotification } from '@openpeeps/core/notifications';
import { notFound, forbidden } from '#lib/errors';

export const Output = expandedNotificationSchema;
export const Param = z.object({
  notificationId: z.string(),
});
export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const notification = await findNotification(await ensureLocalProfile(event), input.notificationId);

    if (!notification) {
      throw notFound();
    }

    return notification;
  },
);
