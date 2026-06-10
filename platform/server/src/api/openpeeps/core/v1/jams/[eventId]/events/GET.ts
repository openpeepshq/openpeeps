import { endpoint, z } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import { jamEventSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@riddl/core';
import {
  findJamEvent,
  listJamEvents,
  listParticipantIds,
} from '@openpeeps/core/jams';
import { notFound } from '#lib/helpers';
import { ensureProfileOrGuest } from '#lib/auth';

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

export const apiEndpoint = endpoint({ Param, Query, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureProfileOrGuest(event, 'read', {
      type: 'jam',
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
