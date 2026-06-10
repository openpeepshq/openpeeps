import { endpoint, z } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import { jamRecordingSchema } from '@openpeeps/common/types';
import { ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findJamEvent, stopRecording } from '@openpeeps/core/jams';
import { notFound } from '#lib/helpers';

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

        ensurePostCapabilities(event, jamEvent, ['core-posts-jam-moderate']);

        const recording = await stopRecording(jamEvent);

        if (!recording) {
            throw notFound('Recording not found');
        }

        return recording;
    },
);
