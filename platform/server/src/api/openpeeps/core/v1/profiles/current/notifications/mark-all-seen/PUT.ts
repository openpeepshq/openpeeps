import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile, ensureScope } from '#lib/auth';
import { successResponseSchema } from '@openpeepshq/common/types';
import { setAllSeen } from '@openpeepshq/core/notifications';

export const Output = successResponseSchema;

export const apiEndpoint = endpoint({ Output }).handle(
  async (_, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);
    await ensureScope(event, 'write', {
      type: 'profiles',
      id: currentProfile.id,
    });

    await setAllSeen(currentProfile);

    return {
      success: true,
    };
  },
);
