import { endpoint } from '#lib/endpoint';
import { z } from 'zod';
import { revokeCalendarFeedToken } from '@openpeepshq/core/calendarFeedTokens';
import { ensureLocalProfile } from '#lib/auth';

export const Input = z.object({
  tokenId: z.string().uuid(),
});

export const Output = z.object({
  success: z.boolean(),
});

export const apiEndpoint = endpoint({ Input, Output }).handle(
  async ({ tokenId }, { event }) => {
    const profile = await ensureLocalProfile(event);
    const success = await revokeCalendarFeedToken(tokenId, profile.id);

    return { success };
  },
);
