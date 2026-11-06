import { endpoint } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { ensureLocalProfile } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { markProfileSeen } from '#lib/presence';

export const Output = successResponseSchema;

export const apiEndpoint = endpoint({ Output }).handle(
  async (_: unknown, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    markProfileSeen(profile.id);
    return { success: true };
  },
);
