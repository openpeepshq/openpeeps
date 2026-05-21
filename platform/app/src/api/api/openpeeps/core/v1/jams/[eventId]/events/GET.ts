import { Endpoint, z } from 'sveltekit-api';
import { forbidden } from '$lib/server/api/errors';
import { jamEventSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import {
  findJamEvent,
  listJamEvents,
  listParticipantIds,
} from '@openpeeps/core/jams';
import { notFound } from '$lib/server/helpers';
import { ensureProfileOrGuest } from '$lib/server/auth';

export const Output = jamEventSchema.array();
export const Param = z.object({
  eventId: z.string(),
});
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Param, Query, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureProfileOrGuest(event, 'read', {
      type: 'jams',
      id: input.eventId,
    });

    const jamEvent = await findJamEvent(input.eventId);

    if (!jamEvent) {
      throw notFound('Jam not found');
    }

    const jamParticipantIds = await listParticipantIds(input.eventId);

    if (!jamParticipantIds.includes(profile?.id ?? '')) {
      throw forbidden('You are not a participant in this jam');
    }

    return listJamEvents(input.eventId, Query.parse(input));
  },
);
