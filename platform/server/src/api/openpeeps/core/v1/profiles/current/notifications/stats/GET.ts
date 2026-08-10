import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import { notificationStatsSchema } from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import { getNotificationStats } from '@openpeepshq/core/notifications';

export const Output = notificationStatsSchema;

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    return getNotificationStats(currentProfile);
  },
);
