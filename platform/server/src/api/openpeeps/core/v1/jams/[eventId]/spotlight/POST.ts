import { parseOccurrenceQuery } from '@openpeepshq/common/lib';
import {
  jamSpotlightRequestSchema,
  successFailureResponseSchema,
} from '@openpeepshq/common/types';
import { endpoint, z } from '#lib/endpoint';
import { notFound, forbidden } from '#lib/errors';
import { findJamEvent, setJamSpotlight } from '@openpeepshq/core/jams';
import { ensureLocalProfile, ensureJamModeration } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';

export const Input = jamSpotlightRequestSchema;
export const Output = successFailureResponseSchema;
export const Param = z.object({
  eventId: z.string(),
});

export const Query = z.object({
  occurrence: z.string().optional(),
});

export const Error = {
  404: notFound(),
  403: forbidden(),
};

export const apiEndpoint = endpoint({
  Input,
  Output,
  Error,
  Param,
  Query,
}).handle(async (input, event: RequestEvent) => {
  await ensureLocalProfile(event);
  const recurrenceId = parseOccurrenceQuery(input.occurrence);

  const jamEvent = await findJamEvent(input.eventId);
  if (!jamEvent) {
    throw notFound(`Object with id ${input.eventId}`);
  }
  // `ensurePostCapabilities` early-returns for public jams, so on a public
  // jam it would let any authenticated user through — and it is also too
  // tight on non-public jams (co-moderators hold no
  // `core-posts-jam-moderate`). `ensureJamModeration` matches the UI gate
  // (`canViewJamAttendees` / `senderMaySpotlight`) and the approved plan:
  // creator, co-moderator, or a real `core-posts-jam-moderate` check.
  await ensureJamModeration(event, jamEvent);

  return await setJamSpotlight(jamEvent, input.identity, recurrenceId);
});
