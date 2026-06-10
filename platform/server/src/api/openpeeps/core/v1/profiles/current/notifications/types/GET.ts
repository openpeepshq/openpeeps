import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import { defaultNotificationTypes } from '@openpeeps/core/notifications';
import { forbidden } from '#lib/errors';
import { notificationTypeSchema } from '@openpeeps/common';

export const Output = notificationTypeSchema.array();

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureLocalProfile(event);

    return defaultNotificationTypes;

  },
);
