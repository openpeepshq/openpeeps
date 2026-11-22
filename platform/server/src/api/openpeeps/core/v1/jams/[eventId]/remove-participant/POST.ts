import { canModerateJam, parseOccurrenceQuery } from '@openpeepshq/common/lib';
import { endpoint, z } from '#lib/endpoint';
import { notFound, forbidden, unprocessableRequest } from '#lib/errors';
import {
  removeParticipantRequestSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { ensureLocalProfile, ensureJamModeration } from '#lib/auth';
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

  // Moderation rule set this block encodes (pinned by
  // remove-participant-POST.test.ts):
  //  1. only the host or a `core-posts-jam-moderate` holder may act
  //     (the gate below);
  //  2. no one may remove themselves (the self-removal check below);
  //  3. a jam moderator — host or co-moderator — cannot be removed/banned
  //     (the `canModerateJam` guard below).
  // Keep all three in lockstep: weakening any one is a regression.
  await ensureJamModeration(event, jamEvent);

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
