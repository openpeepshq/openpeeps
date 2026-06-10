import { endpoint, z } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import {
  muteParticipantRequestSchema,
  successFailureResponseSchema,
} from '@openpeeps/common/types';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { muteParticipant } from '@openpeeps/core/jams';

export const Input = muteParticipantRequestSchema;
export const Output = successFailureResponseSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Input, Output, Error, Param }).handle(
  async (input, event: RequestEvent) => {
    await ensureLocalProfile(event);

    return await muteParticipant(
      input.eventId,
      muteParticipantRequestSchema.parse({ ...input, jamId: input.eventId }),
    );
  },
);
