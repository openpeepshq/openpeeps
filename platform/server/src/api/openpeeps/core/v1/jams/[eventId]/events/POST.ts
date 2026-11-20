import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { jamEventDataSchema, jamEventSchema } from '@openpeepshq/common/types';
import { ensureProfileOrGuest } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import {
  createJamEvent,
  findJamEvent,
  listParticipantIds,
} from '@openpeepshq/core/jams';

export const Input = jamEventDataSchema;
export const Output = jamEventSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const jamEvent = await findJamEvent(input.eventId);
    if (!jamEvent) {
      throw notFound('Jam');
    }

    const profile = await ensureProfileOrGuest(event, 'read', {
      type: 'jams',
      id: jamEvent?.id ?? '',
    });

    const jamParticipantIds = await listParticipantIds(input.eventId);

    if (!jamParticipantIds.includes(profile.id)) {
      throw forbidden('You are not a participant in this jam');
    }

    return createJamEvent(
      jamEventDataSchema.parse({ ...input, jamId: input.eventId }),
    );
  },
);
