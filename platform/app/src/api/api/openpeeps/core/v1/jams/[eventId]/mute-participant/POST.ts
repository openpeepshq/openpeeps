import { Endpoint, z } from 'sveltekit-api';
import { forbidden } from '$lib/server/api/errors';
import {
  muteParticipantRequestSchema,
  successFailureResponseSchema,
} from '@openpeeps/common/types';
import { ensureLocalProfile } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { muteParticipant } from '@openpeeps/core/jams';

export const Input = muteParticipantRequestSchema;
export const Output = successFailureResponseSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Input, Output, Error, Param }).handle(
  async (input, event: RequestEvent) => {
    await ensureLocalProfile(event);

    return await muteParticipant(
      input.eventId,
      muteParticipantRequestSchema.parse({ ...input, jamId: input.eventId }),
    );
  },
);
