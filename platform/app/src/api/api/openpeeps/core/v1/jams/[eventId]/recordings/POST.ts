import { Endpoint, z } from 'sveltekit-api';
import { forbidden, fromOpenpeepsError } from '$lib/server/api/errors';
import type { OpenpeepsError } from '@openpeeps/common/types';
import { jamRecordingSchema } from '@openpeeps/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { isOpenpeepsError } from '@openpeeps/core/errors';
import { findJamEvent, startRecording } from '@openpeeps/core/jams';
import { notFound } from '$lib/server/helpers';

export const Output = jamRecordingSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const jamEvent = await findJamEvent(input.eventId);
    if (!jamEvent) {
      throw notFound('Jam not found');
    }

    const profile = await ensureLocalProfile(event);

    await ensurePostCapabilities(event, jamEvent, ['core-posts-jam-moderate']);

    try {
      return await startRecording(profile, jamEvent);
    } catch (err) {
      if (isOpenpeepsError(err)) {
        throw fromOpenpeepsError(err as OpenpeepsError);
      }
      throw err;
    }
  },
);
