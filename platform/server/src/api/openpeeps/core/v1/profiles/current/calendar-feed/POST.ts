import { endpoint, z } from '#lib/endpoint';
import { calendarFeedTokenResponseSchema } from '@openpeepshq/common/types';
import {
  createCalendarFeedToken,
  revokeAllCalendarFeedTokens,
} from '@openpeepshq/core/calendarFeedTokens';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';

export const Input = z.object({});
export const Output = calendarFeedTokenResponseSchema;

export const apiEndpoint = endpoint({ Input, Output }).handle(
  async (_input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);

    // Reset semantics: minting a new calendar link revokes every previous
    // token for this profile, so old subscriber URLs stop working.
    await revokeAllCalendarFeedTokens(profile.id);
    const { plainToken } = await createCalendarFeedToken(profile.id);

    return { success: true as const, token: plainToken };
  },
);
