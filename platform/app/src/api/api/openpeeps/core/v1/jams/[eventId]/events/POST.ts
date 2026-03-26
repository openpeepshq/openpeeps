import { Endpoint, z } from 'sveltekit-api';
import { forbidden } from '$lib/server/api/errors';
import { jamEventDataSchema, jamEventSchema, type JamEvent, type JamEventData } from '@openpeeps/common/types';
import { ensureProfileOrGuest } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { createJamEvent, findJamEvent, listParticipantIds } from '@openpeeps/core/jams';
import { notFound } from '$lib/server/helpers';

export const Input = jamEventDataSchema;
export const Output = jamEventSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Input, Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const jamEvent = await findJamEvent(input.eventId);
    if (!jamEvent) {
      throw notFound('Jam not found');
    }

    const profile = await ensureProfileOrGuest(event, 'read', {
      type: 'jam',
      id: jamEvent?.id ?? '',
    });


    const jamParticipantIds = await listParticipantIds(input.eventId);

    if (
      !jamParticipantIds.includes(profile.id)
    ) {
      throw forbidden('You are not a participant in this jam');
    }

    return createJamEvent(
      jamEventDataSchema.parse({ ...input, jamId: input.eventId }),
    );
  },
);
