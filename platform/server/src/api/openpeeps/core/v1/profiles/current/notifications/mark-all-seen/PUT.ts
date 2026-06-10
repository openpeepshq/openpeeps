import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { ensureLocalProfile } from '#lib/auth';
import { successResponseSchema } from '@openpeeps/common/types';
import { setAllSeen } from '@openpeeps/core/notifications';

export const Output = successResponseSchema;

export const apiEndpoint = endpoint({ Output }).handle(
  async (_, event: RequestEvent) => {
    const currentProfile = await ensureLocalProfile(event);

    await setAllSeen(currentProfile);

    return {
      success: true,
    };
  },
);
