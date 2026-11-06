import {
  targetBlockedViewer,
  toBlockedProfileStub,
  viewerBlockedTarget,
} from '@openpeepshq/common/lib';
import {
  publicProfileSchema,
  type ProfileWithMeta,
  type PublicProfile,
} from '@openpeepshq/common/types';

import { ensureProfileCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { notFound } from '#lib/errors';
import { withPresenceForViewer } from '#lib/presence';

export const publicProfileForViewer = async (
  event: RequestEvent,
  target: ProfileWithMeta,
  notFoundLabel: string,
): Promise<PublicProfile> => {
  const viewer = event.context.currentProfile as ProfileWithMeta | undefined;
  if (targetBlockedViewer(viewer, target.id)) {
    throw notFound(notFoundLabel);
  }
  if (viewerBlockedTarget(viewer, target.id)) {
    return toBlockedProfileStub(target);
  }

  await ensureProfileCapabilities(event, target, ['core-profiles-read']);
  const profile = publicProfileSchema.parse(target);
  return await withPresenceForViewer(viewer, target, profile);
};
