import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile, ensureScope } from '#lib/auth';
import {
  excludeTypesQuerySchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { setAllSeen } from '@openpeepshq/core/notifications';

export const Output = successResponseSchema;

export const Query = z.object({
  /** Comma-separated types to leave untouched (the feed's hidden types). */
  excludeTypes: excludeTypesQuerySchema,
});

export const apiEndpoint = endpoint({ Output, Query }).handle(
  async (param, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);
    await ensureScope(event, 'write', {
      type: 'profiles',
      id: currentProfile.id,
    });

    await setAllSeen(currentProfile, Query.parse(param).excludeTypes);

    return {
      success: true,
    };
  },
);
