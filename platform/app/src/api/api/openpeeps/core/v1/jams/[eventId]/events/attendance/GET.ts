import { Endpoint, z } from 'sveltekit-api';
import { forbidden } from '$lib/server/api/errors';
import { jamEventSchema } from '@openpeeps/common/types';
import { ensureLocalProfile } from '$lib/server/auth';
import type { RequestEvent } from '@sveltejs/kit';
import {
  findJamEvent,
  listAttendance,
  listParticipantIds,
} from '@openpeeps/core/jams';
import { notFound } from '$lib/server/helpers';
import { jamFromEvent } from '@openpeeps/common/lib';

export const Output = jamEventSchema.array();
export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Param, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    const jamEvent = await findJamEvent(input.eventId);

    if (!jamEvent) {
      throw notFound('Jam not found');
    }

    const jam = jamFromEvent(jamEvent);

    const jamParticipantIds = await listParticipantIds(input.eventId);

    const isJamModerator = jam?.moderators?.find(
      (moderatorId) => moderatorId === profile?.id,
    );
    const isJamSpeaker = jam?.speakers?.find(
      (speakerId) => speakerId === profile?.id,
    );
    const isJamParticipant = jamParticipantIds.includes(profile?.id);

    if (!isJamModerator && !isJamSpeaker && !isJamParticipant) {
      throw forbidden('You are not a participant in this jam');
    }

    return listAttendance(input.eventId);
  },
);
