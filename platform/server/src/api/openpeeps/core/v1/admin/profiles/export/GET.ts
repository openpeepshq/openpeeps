import { endpoint } from '#lib/endpoint';
import { forbidden } from '#lib/errors';
import type { RequestEvent } from '@riddl/core';
import { exportMembersCsv } from '@openpeepshq/core/profiles';
import { ensureRoleCapabilities } from '#lib/auth';

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Error }).handle(
  async (_, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-profiles-read']);
    const csv = await exportMembersCsv();

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="members.csv"',
      },
    });
  },
);
