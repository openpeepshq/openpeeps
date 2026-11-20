import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { revokeAllCalendarFeedTokens } from '@openpeepshq/core/calendarFeedTokens';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';

export const Input = z.object({});
export const Output = successResponseSchema;

export const apiEndpoint = endpoint({ Input, Output }).handle(
  async (_input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    await revokeAllCalendarFeedTokens(profile.id);
    return { success: true as const };
  },
);
