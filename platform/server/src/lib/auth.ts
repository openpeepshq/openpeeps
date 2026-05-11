import {
  profileWithMetaSchema,
  type AccountWithMeta,
  type Authorization,
  type GroupWithMeta,
  type Identity,
  type PostWithMeta,
  type ProfileWithMeta,
  type PublicProfile,
  type ReportWithMeta,
  type Resource,
} from '@openpeeps/common/types';

import { findProfile } from '@openpeeps/core/profiles';
import { findAccount } from '@openpeeps/core/accounts';
import type { RequestEvent } from '@riddl/core';
import { authNeeded, forbidden } from './errors';
import {
  checkGroupCapabilities,
  checkPostCapabilities,
  checkProfileCapabilities,
  checkReportCapabilities,
  checkRoleCapabilities,
} from '@openpeeps/common/lib';
import { capabilitiesConfig, config } from '@openpeeps/core/config';
import { checkSubscription } from '@openpeeps/core/stripe';

export const loadCurrentProfile = async (
  authorization: Authorization,
): Promise<ProfileWithMeta | undefined> => {
  const id = authorization.identities.find(
    (identity: Identity) =>
      identity.type === 'current-profile' || identity.type === 'guest-profile',
  )?.id;

  if (id) {
    const profile = await findProfile(id);
    if (profile && !profile.deletedAt) {
      const parsedProfileResult = profileWithMetaSchema.safeParse(profile);
      if (parsedProfileResult.success) {
        return parsedProfileResult.data as ProfileWithMeta;
      } else {
        console.error('Invalid profile', parsedProfileResult.error);
      }
    }
  }

  return undefined;
};

export const loadCurrentAccount = async (
  authorization: Authorization,
): Promise<AccountWithMeta | undefined> => {
  const id = authorization.identities.find(
    (identity: Identity) => identity.type === 'local',
  )?.id;

  if (id) {
    const account = await findAccount(id);
    if (account && !account.deletedAt) {
      return account;
    }
  }
  return undefined;
};

export const ensureAccount = (event: RequestEvent) => {
  if (!event.context.currentAccount) {
    throw authNeeded();
  } else {
    return event.context.currentAccount;
  }
};

export const ensureRoleCapabilities = async (
  event: RequestEvent,
  capabilities: string[],
) => {
  const profile = await ensureLocalProfile(event);

  const { success } = checkRoleCapabilities(capabilities, profile.roles);

  if (!success) {
    throw forbidden();
  }

  return profile;
};

export const ensureGroupCapabilities = async (
  event: RequestEvent,
  capabilities: string[],
  group: GroupWithMeta,
) => {
  const profile = await ensureProfileOrPublicCommunity(event);

  const { success, missingCapabilities } = checkGroupCapabilities(
    capabilities,
    profile,
    group,
  );

  if (!success) {
    throw forbidden(`Missing capabilities: ${missingCapabilities.join(', ')}`);
  }
};

export const ensurePostCapabilities = async (
  event: RequestEvent,
  post: PostWithMeta,
  capabilities: string[],
) => {
  if (
    post.type === 'event' &&
    post.data?.type === 'event' &&
    post.data?.jam &&
    post.visibility === 'public'
  ) {
    return;
  }

  const profile = await ensureProfileOrPublicCommunity(event);
  const { success, missingCapabilities } = checkPostCapabilities(
    capabilities,
    profile,
    post,
    await capabilitiesConfig(),
  );

  if (!success) {
    throw forbidden(`Missing capabilities: ${missingCapabilities.join(', ')}`);
  }
};

export const ensureProfileCapabilities = async (
  event: RequestEvent,
  targetProfile: PublicProfile,
  capabilities: string[],
) => {
  const profile = await ensureProfileOrPublicCommunity(event);
  const { success, missingCapabilities } = checkProfileCapabilities(
    capabilities,
    profile,
    targetProfile,
    await capabilitiesConfig(),
  );

  if (!success) {
    throw forbidden(`Missing capabilities: ${missingCapabilities.join(', ')}`);
  }
};

export const ensureReportCapabilities = async (
  event: RequestEvent,
  report: ReportWithMeta,
  capabilities: string[],
) => {
  const profile = await ensureProfileOrPublicCommunity(event);
  const { success, missingCapabilities } = checkReportCapabilities(
    capabilities,
    profile,
    report,
    await capabilitiesConfig(),
  );

  if (!success) {
    throw forbidden(`Missing capabilities: ${missingCapabilities.join(', ')}`);
  }
};

const ensureProfileMaybe = async (
  event: RequestEvent,
  options: { publiclyAccessible: boolean; subscriptionRequired: boolean } = {
    publiclyAccessible: false,
    subscriptionRequired: true,
  },
) => {
  const { publiclyAccessible, subscriptionRequired } = options;
  const profile = event.context.currentProfile;
  const account = event.context.currentAccount;

  if (!(profile?.type === 'local') && !publiclyAccessible) {
    throw authNeeded('Valid profile needed');
  }

  if (
    profile?.type === 'local' &&
    subscriptionRequired &&
    !(await checkSubscription(profile, account))
  ) {
    throw forbidden('Subscription needed');
  }

  return profile;
};

export const ensureLocalProfile = async (
  event: RequestEvent,
  subscriptionRequired: boolean = true,
): Promise<ProfileWithMeta> =>
  (await ensureProfileMaybe(event, {
    publiclyAccessible: false,
    subscriptionRequired,
  }))!;

export const ensureProfileOrPublicCommunity = async (
  event: RequestEvent,
  subscriptionRequired: boolean = true,
) => {
  const coreConfig = await config();
  return ensureProfileMaybe(event, {
    publiclyAccessible: coreConfig.server.publicContent,
    subscriptionRequired,
  });
};

export const isService = (authorization: Authorization) => {
  return authorization.identities.find((i) => i.type === 'service');
};

export const scopeMatches = ({
  authorization,
  scope,
  resource,
}: {
  authorization?: Authorization | null;
  scope?: string;
  resource: Resource;
}) => {
  if (!authorization?.scopes) {
    return false;
  }
  return !!authorization.scopes.find(
    (s) =>
      (s.scope === scope || !scope) &&
      (s.resource.id === resource.id || s.resource.id === '*') &&
      s.resource.type === resource.type,
  );
};

export const serviceScopeMatches = ({
  authorization,
  scope,
  resource,
}: {
  authorization: Authorization;
  scope?: string;
  resource: Resource;
}) => {
  return (
    isService(authorization) &&
    scopeMatches({
      authorization,
      scope,
      resource,
    })
  );
};

export const ensureProfileOrGuest = async (
  event: RequestEvent,
  scope?: string,
  resource?: Resource,
): Promise<ProfileWithMeta> => {
  const currentProfile = event.context.currentProfile;
  const authorization = event.context.authorization;

  if (
    currentProfile &&
    (currentProfile.type === 'local' ||
      (currentProfile.type === 'guest' && !scope) ||
      !resource ||
      scopeMatches({
        authorization,
        scope,
        resource,
      }))
  ) {
    return currentProfile!;
  } else {
    throw authNeeded('Valid profile needed');
  }
};

export const ensureServiceScope = async (
  event: RequestEvent,
  scope: string | undefined,
  resource: Resource,
) => {
  const authorization = event.context.authorization;
  if (!authorization?.identities.find((i) => i.type === 'service')) {
    throw authNeeded('Service key needed');
  }
  if (
    !scopeMatches({
      authorization,
      scope,
      resource,
    })
  ) {
    throw forbidden(
      `Scope ${scope ?? ''} for ${resource.type} - ${resource.id} not authorized. Authorization: ${JSON.stringify(authorization)}`,
    );
  }
};
