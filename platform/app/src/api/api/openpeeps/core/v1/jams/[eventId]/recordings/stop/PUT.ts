import { Endpoint, z } from 'sveltekit-api';
import { forbidden } from '$lib/server/api/errors';
import { jamRecordingSchema } from '@openpeeps/common/types';
import { ensurePostCapabilities } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import { findJamEvent, stopRecording } from '@openpeeps/core/jams';
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

        ensurePostCapabilities(event, jamEvent, ['core-posts-jam-moderate']);

        const recording = await stopRecording(jamEvent);

        if (!recording) {
            throw notFound('Recording not found');
        }

        return recording;
    },
);
