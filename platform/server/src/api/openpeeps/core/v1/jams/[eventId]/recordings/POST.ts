import { endpoint, z } from '#lib/endpoint';
import { forbidden, rethrowIfOpenpeepsError } from '#lib/errors';
import { jamRecordingSchema } from '@openpeepshq/common/types';
import { parseOccurrenceQuery } from '@openpeepshq/common/lib';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findJamEvent, startRecording } from '@openpeepshq/core/jams';
import { notFound } from '#lib/helpers';

export const Output = jamRecordingSchema;
export const Param = z.object({
  eventId: z.string(),
});
export const Query = z.object({
  occurrence: z.string().optional(),
});

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Param, Query, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const jamEvent = await findJamEvent(input.eventId);
    if (!jamEvent) {
      throw notFound('Jam not found');
    }

    const profile = await ensureLocalProfile(event);

    await ensurePostCapabilities(event, jamEvent, ['core-posts-jam-moderate']);

    return startRecording(
      profile,
      jamEvent,
      parseOccurrenceQuery(input.occurrence),
    ).catch(rethrowIfOpenpeepsError);
  },
);
