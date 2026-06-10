import { endpoint, z } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import { jamEventDataSchema, jamRecordingSchema } from '@openpeeps/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { createJamEvent, findJamEvent, startRecording } from '@openpeeps/core/jams';
import { notFound } from '#lib/helpers';
import { uuidv7 } from 'uuidv7';

export const Output = jamRecordingSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const jamEvent = await findJamEvent(input.eventId);
    if (!jamEvent) {
      throw notFound('Jam not found');
    }

    const profile = await ensureLocalProfile(event);

    ensurePostCapabilities(event, jamEvent, ['core-posts-jam-moderate']);

    const recording = await startRecording(profile, jamEvent);

    await createJamEvent(
      jamEventDataSchema.parse({ id: uuidv7(), type: 'recordStart', profileId: profile.id, jamId: input.eventId }),
    );

    return recording;
  },
);
