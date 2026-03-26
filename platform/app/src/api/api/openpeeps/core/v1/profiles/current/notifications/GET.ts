import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import {
  type PublicNotification,
  publicNotificationSchema,
} from '@openpeeps/common/types';
import { ensureLocalProfile } from '$lib/server/auth';
import { listNotificationsByProfile } from '@openpeeps/core/notifications';
import { forbidden } from '$lib/server/api/errors';

export const Output = publicNotificationSchema.array();

export const Error = {
  403: forbidden(),
};

export const Query = z.object({
  limit: z.coerce.number().optional(),
  start: z.string().optional(),
});

export default new Endpoint({ Output, Error, Query }).handle(
  async (param, event: RequestEvent): Promise<PublicNotification[]> =>
    listNotificationsByProfile(await ensureLocalProfile(event), Query.parse(param))
);
