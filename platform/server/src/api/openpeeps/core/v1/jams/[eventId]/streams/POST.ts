import { endpoint, z } from '#lib/endpoint';
import {
  forbidden,
  rethrowIfOpenpeepsError,
  unprocessableRequest,
} from '#lib/errors';
import {
  jamRtmpStreamRequestSchema,
  jamRtmpStreamResponseSchema,
} from '@openpeepshq/common/types';
import {
  assembleRtmpUrl,
  canModerateJam,
  rtmpDestinationHost,
  toRtmpStreamResponse,
} from '@openpeepshq/common/lib';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findJamEvent, startRtmpStream } from '@openpeepshq/core/jams';
import { notFound } from '#lib/helpers';

export const Input = jamRtmpStreamRequestSchema;
export const Output = jamRtmpStreamResponseSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({ Input, Output, Param, Error }).handle(
  async (input, event: RequestEvent) => {
    const jamEvent = await findJamEvent(input.eventId);
    if (!jamEvent) {
      throw notFound('Jam not found');
    }

    const profile = await ensureLocalProfile(event);
    if (!canModerateJam(profile, jamEvent)) {
      throw forbidden();
    }

    const rtmpUrl = assembleRtmpUrl(input.url, input.streamKey);
    if (!rtmpUrl) {
      throw unprocessableRequest('Invalid RTMP URL');
    }

    const recording = await startRtmpStream(
      profile,
      jamEvent,
      rtmpUrl,
      rtmpDestinationHost(rtmpUrl),
    ).catch(rethrowIfOpenpeepsError);

    return toRtmpStreamResponse(recording);
  },
);
