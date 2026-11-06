import { endpoint } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { markProfileSeen } from '#lib/presence';

export const Output = successResponseSchema;

// Only profiles whose presence someone may actually see (core-presence-read:
// owner via `*`, admin and moderator by default) report it — tracking
// ordinary members' activity would have no consumer.
export const apiEndpoint = endpoint({ Output }).handle(
  async (_: unknown, event: RequestEvent) => {
    const profile = await ensureRoleCapabilities(event, ['core-presence-read']);
    await markProfileSeen(profile.id);
    return { success: true };
  },
);
