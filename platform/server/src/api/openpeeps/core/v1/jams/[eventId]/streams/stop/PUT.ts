import { endpoint, z } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import { jamRtmpStreamResponseSchema } from '@openpeepshq/common/types';
import { canModerateJam, toRtmpStreamResponse } from '@openpeepshq/common/lib';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findJamEvent, stopRtmpStream } from '@openpeepshq/core/jams';
import { notFound } from '#lib/helpers';

export const Output = jamRtmpStreamResponseSchema;
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
    if (!canModerateJam(profile, jamEvent)) {
      throw forbidden();
    }

    const stream = await stopRtmpStream(jamEvent);
    if (!stream) {
      throw notFound('Stream not found');
    }

    return toRtmpStreamResponse(stream);
  },
);
