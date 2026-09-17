import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { canViewJamAttendees } from '@openpeepshq/common/lib';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { exportJamAttendanceCsv, findJamEvent } from '@openpeepshq/core/jams';

export const Param = z.object({
  eventId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    const jamEvent = await findJamEvent(input.eventId);

    if (!jamEvent) {
      throw notFound('Jam');
    }

    if (!canViewJamAttendees(profile, jamEvent)) {
      throw forbidden('You cannot export attendees for this jam');
    }

    const csv = await exportJamAttendanceCsv(input.eventId);

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="jam-attendees.csv"',
      },
    });
  },
);
