import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import {
  type PublicNotification,
  publicNotificationSchema,
} from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import { listNotificationsByProfile } from '@openpeepshq/core/notifications';
import { forbidden } from '#lib/errors';

export const Output = publicNotificationSchema.array();

export const Error = {
  403: forbidden(),
};

export const Query = z.object({
  limit: z.coerce.number().optional(),
  start: z.string().optional(),
});

export const apiEndpoint = endpoint({ Output, Error, Query }).handle(
  async (param, event: RequestEvent): Promise<PublicNotification[]> =>
    listNotificationsByProfile(await ensureLocalProfile(event), Query.parse(param))
);
