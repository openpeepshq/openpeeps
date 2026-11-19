import { canModerateJam, parseOccurrenceQuery } from '@openpeepshq/common/lib';
import { endpoint, z } from '#lib/endpoint';
import { notFound, forbidden, unprocessableRequest } from '#lib/errors';
import {
  removeParticipantRequestSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { ensureLocalProfile, ensurePostCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findJamEvent, removeParticipant } from '@openpeepshq/core/jams';

export const Input = removeParticipantRequestSchema;
export const Output = successResponseSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Query = z.object({
  occurrence: z.string().optional(),
});

export const Error = {
  404: notFound(),
  403: forbidden(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({
  Input,
  Output,
  Error,
  Param,
  Query,
}).handle(async (input, event: RequestEvent) => {
  const profile = await ensureLocalProfile(event);
  const jamEvent = await findJamEvent(input.eventId);

  if (!jamEvent) {
    throw notFound(`Jam with id ${input.eventId}`);
  }

  // Explicit host-or-moderator gate: ensurePostCapabilities early-returns for
  // public jams, so the host is checked directly first (close/PUT.ts).
  if (jamEvent.profile.id !== profile.id) {
    await ensurePostCapabilities(event, jamEvent, ['core-posts-jam-moderate']);
  }

  if (profile.id === input.identity) {
    throw unprocessableRequest('A moderator cannot remove themselves');
  }

  // A moderator (host or co-moderator) can be demoted from the jam config but
  // not removed/banned: a banned moderator would be stuck in an incoherent
  // state — still holding the moderation capability yet locked out by
  // `error.jamBanned`, and unable to lift their own ban.
  if (canModerateJam({ id: input.identity }, jamEvent)) {
    throw unprocessableRequest(
      'A jam moderator cannot be removed from the jam',
    );
  }

  await removeParticipant(
    jamEvent,
    input.identity,
    parseOccurrenceQuery(input.occurrence),
  );

  return { success: true };
});
