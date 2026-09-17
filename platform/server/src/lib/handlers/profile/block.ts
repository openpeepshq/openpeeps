import {
  sharesControllingAccount,
  targetBlockedViewer,
  toBlockedProfileStub,
  viewerBlockedTarget,
} from '@openpeepshq/common/lib';
import {
  publicProfileSchema,
  type ProfileWithMeta,
  type PublicProfile,
  type SuccessResponse,
} from '@openpeepshq/common/types';

import { ensureLocalProfile, ensureProfileCapabilities } from '#lib/auth';
import type { RequestEvent } from '@riddl/core';
import { z } from '#lib/endpoint';
import { forbidden, notFound } from '#lib/errors';
import {
  blockProfile,
  findProfile,
  listBlockedProfiles,
  unblockProfile,
} from '@openpeepshq/core/profiles';

export const blockParamsSchema = z.object({
  profileId: z.string(),
});

export type BlockParams = z.infer<typeof blockParamsSchema>;

const cannotBlock = (actor: ProfileWithMeta, target: ProfileWithMeta) =>
  actor.id === target.id || sharesControllingAccount(actor, target);

export const blockProfileHandler = async (
  params: BlockParams,
  event: RequestEvent,
): Promise<SuccessResponse> => {
  const profile = await ensureLocalProfile(event);
  const target = await findProfile(params.profileId);

  if (!target || targetBlockedViewer(profile, target.id)) {
    throw notFound(`profile with id ${params.profileId}`);
  }
  if (cannotBlock(profile, target)) {
    throw forbidden();
  }

  if (!viewerBlockedTarget(profile, target.id)) {
    await ensureProfileCapabilities(event, target, ['core-profiles-block']);
  }
  await blockProfile(profile, target);

  return { success: true };
};

export const unblockProfileHandler = async (
  params: BlockParams,
  event: RequestEvent,
): Promise<SuccessResponse> => {
  const profile = await ensureLocalProfile(event);
  const target = await findProfile(params.profileId);

  if (!target) {
    throw notFound(`profile with id ${params.profileId}`);
  }

  await ensureProfileCapabilities(event, target, ['core-profiles-unblock']);
  await unblockProfile(profile, target);

  return { success: true };
};

export const listBlockedProfilesHandler = async (
  _: unknown,
  event: RequestEvent,
): Promise<PublicProfile[]> => {
  const profile = await ensureLocalProfile(event);
  const blocked = await listBlockedProfiles(profile);
  return blocked.map((item) => publicProfileSchema.parse(item));
};

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
  return publicProfileSchema.parse(target);
};
