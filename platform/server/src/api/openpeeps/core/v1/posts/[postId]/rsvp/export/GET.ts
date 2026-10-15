import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound, unprocessableRequest } from '#lib/errors';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import {
  canManageEventRsvps,
  parseOccurrenceQuery,
  rsvpExportFilename,
} from '@openpeepshq/common/lib';
import { exportEventRsvpsCsv, findPost } from '@openpeepshq/core/posts';

export const Param = z.object({
  postId: z.string(),
});

export const Query = z.object({
  occurrence: z.string().optional(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
  422: unprocessableRequest(),
};

export const apiEndpoint = endpoint({ Param, Query, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    const post = await findPost(input.postId);

    if (!post || post.data?.type !== 'event') {
      throw notFound('Event');
    }

    if (!canManageEventRsvps(profile, post)) {
      throw forbidden('You cannot export RSVPs for this event');
    }

    const occurrenceId = input.occurrence
      ? parseOccurrenceQuery(input.occurrence)
      : undefined;
    if (input.occurrence && !occurrenceId) {
      throw unprocessableRequest('Invalid occurrence');
    }

    const csv = await exportEventRsvpsCsv(post, { occurrenceId });
    const filename = rsvpExportFilename(post.data.name, new Date());

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  },
);
