import { endpoint, z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import { ensureLocalProfile, ensureProfileCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { findProfile, markProfilesSeen } from '@openpeepshq/core/profiles';
import { successResponseSchema } from '@openpeepshq/common/types';

export const Input = z.object({
  profileIds: z.string().array(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    const profile = await ensureLocalProfile(event);
    const uniqueIds = Array.from(new Set(input.profileIds));

    // One id per request by design (the web hook reports a single profile
    // after its dwell delay), so per-id `findProfile` calls are intentional
    // rather than the sibling posts/seen's batched lookup — there is no
    // batched profile finder to align with.
    const targets: { id: string }[] = [];
    for (const id of uniqueIds) {
      const target = await findProfile(id);
      if (!target) {
        throw notFound(`Object with id ${id}`);
      }
      // Self-views are excluded: a top-profiles ranking inflated by members
      // inspecting their own pages is noise (agreed in the #802 plan).
      if (target.id === profile.id) continue;
      await ensureProfileCapabilities(event, target, ['core-profiles-read']);
      targets.push({ id: target.id });
    }

    if (targets.length === 0) return { success: true };
    await markProfilesSeen(
      targets.map((t) => t.id),
      profile,
    );

    return { success: true };
  },
);
