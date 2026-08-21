import { endpoint, z } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import { jamRecordingSchema } from '@openpeepshq/common/types';
import { parseOccurrenceQuery } from '@openpeepshq/common/lib';
import { ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findJamEvent, stopRecording } from '@openpeepshq/core/jams';
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

    ensurePostCapabilities(event, jamEvent, ['core-posts-jam-moderate']);

    const recording = await stopRecording(
      jamEvent,
      parseOccurrenceQuery(input.occurrence),
    );

    if (!recording) {
      throw notFound('Recording not found');
    }

    return recording;
  },
);
