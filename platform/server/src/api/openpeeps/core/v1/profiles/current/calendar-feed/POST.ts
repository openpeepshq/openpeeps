import { endpoint } from '#lib/endpoint';
import { tokenResponseSchema } from '@openpeepshq/common/types';
import { createCalendarFeedToken } from '@openpeepshq/core/calendarFeedTokens';
import { ensureLocalProfile } from '#lib/auth';

export const Input = tokenResponseSchema;
export const Output = tokenResponseSchema;

export const apiEndpoint = endpoint({ Input, Output }).handle(
  async (_input, { event }) => {
    const profile = await ensureLocalProfile(event);
    const { plainToken, tokenId } = await createCalendarFeedToken(profile.id);

    return {
      success: true,
      token: plainToken,
    };
  },
);
