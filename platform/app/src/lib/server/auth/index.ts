import {
  profileWithMetaSchema,
  type AccessTokenWithMeta,
  type AccountWithMeta,
  type Authorization,
  type GroupWithMeta,
  type PostWithMeta,
  type ProfileWithMeta,
  type PublicProfile,
  type ReportWithMeta,
  type Resource,
  type ScopeLevel,
} from '@openpeeps/common/types';

import { findProfile } from '@openpeeps/core/profiles';
import { findAccount } from '@openpeeps/core/accounts';
import type { RequestEvent } from '@sveltejs/kit';
import { authNeeded, forbidden } from '$lib/server/api/errors';
import {
  checkAccessTokenCapabilities,
  checkGroupCapabilities,
  checkPostCapabilities,
  checkProfileCapabilities,
  checkReportCapabilities,
  checkRoleCapabilities,
  scopeMatches,
} from '@openpeeps/common/lib';
import { capabilitiesConfig, config } from '@openpeeps/core/config';
import { checkSubscription } from '@openpeeps/core/stripe';

export const loadCurrentProfile = async (
  authorization: Authorization,
): Promise<ProfileWithMeta | undefined> => {
  const id = authorization.identities?.profile;
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
  const id = authorization.identities?.account;
  if (id) {
    const account = await findAccount(id);
    if (account && !account.deletedAt) {
      return account;
    }
  }
  return undefined;
};

export const ensureAccount = (event: RequestEvent) => {
  if (!event.locals.currentAccount) {
    throw authNeeded();
  } else {
    return event.locals.currentAccount;
  }
};

export const ensureRoleCapabilities = async (
  event: RequestEvent,
  capabilities: string[],
) => {
  const profile = await ensureLocalProfile(event);

  const { success } = checkRoleCapabilities(profile.roles, capabilities);

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
  await ensureAccess(event);

  const { success, missingCapabilities } = checkGroupCapabilities(
    event.locals.authData,
    capabilities,
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

  if (post.type === 'event' && post.data?.type === 'event' && post.data?.jam && post.visibility === 'public') {
    return;
  }

  await ensureAccess(event);
  const { success, missingCapabilities } = checkPostCapabilities(
    event.locals.authData,
    capabilities,
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
  await ensureAccess(event);
  const { success, missingCapabilities } = checkProfileCapabilities(
    event.locals.authData,
    capabilities,
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
  await ensureAccess(event);
  const { success, missingCapabilities } = checkReportCapabilities(
    event.locals.authData,
    capabilities,
    report,
    await capabilitiesConfig(),
  );

  if (!success) {
    throw forbidden(`Missing capabilities: ${missingCapabilities.join(', ')}`);
  }
};

export const ensureAccessTokenCapabilities = async (
  event: RequestEvent,
  accessToken: AccessTokenWithMeta,
  capabilities: string[],
) => {
  await ensureAccess(event);
  const { success, missingCapabilities } = checkAccessTokenCapabilities(
    event.locals.authData,
    capabilities,
    accessToken,
    await capabilitiesConfig(),
  );

  if (!success) {
    throw forbidden(`Missing capabilities: ${missingCapabilities.join(', ')}`);
  }
};

const ensureProfileMaybe = async (
  event: RequestEvent,
  options: { publiclyAccessible: boolean, subscriptionRequired: boolean } = { publiclyAccessible: false, subscriptionRequired: true },
) => {

  const { publiclyAccessible, subscriptionRequired } = options;
  const profile = event.locals.currentProfile;
  const account = event.locals.currentAccount;

  if (!(profile?.type === 'local') && !isService(event.locals.authorization) && !publiclyAccessible) {
    throw authNeeded('Valid profile needed');
  }

  if (profile?.type === 'local' && subscriptionRequired && !(await checkSubscription(profile, account))) {
    throw forbidden('Subscription needed');
  }

  return profile;
};

export const ensureLocalProfile = async (event: RequestEvent, subscriptionRequired: boolean = true): Promise<ProfileWithMeta> =>
  (await ensureProfileMaybe(event, { publiclyAccessible: false, subscriptionRequired }))!;

export const ensureAccess = async (event: RequestEvent, subscriptionRequired: boolean = true) => {
  const coreConfig = await config();
  return ensureProfileMaybe(event, { publiclyAccessible: coreConfig.server.publicContent, subscriptionRequired });
};

const isService = (authorization?: Authorization) =>
  !!authorization?.identities?.service;

export const serviceScopeMatches = ({
  authorization,
  scopeLevel,
  resource,
}: {
  authorization: Authorization;
  scopeLevel?: ScopeLevel;
  resource: Resource;
}) => {
  return (
    isService(authorization) &&
    scopeMatches({
      scopes: authorization.scopes,
      requiredScope: {
        scopeLevel,
        resource,
      },
    })
  );
};

export const ensureProfileOrGuest = async (
  event: RequestEvent,
  scopeLevel?: ScopeLevel,
  resource?: Resource,
): Promise<ProfileWithMeta> => {
  if (
    event.locals.currentProfile && (
      event.locals.currentProfile.type === 'local' ||
      (event.locals.currentProfile.type === 'guest' &&
        (!scopeLevel ||
          !resource ||
          scopeMatches({
            scopes: event.locals.authorization?.scopes,
            requiredScope: {
              scopeLevel,
              resource,
            },
          })))
    )
  ) {
    return event.locals.currentProfile;
  } else {
    throw authNeeded('Valid profile needed');
  }
};

export const ensureScope = async (
  event: RequestEvent,
  scopeLevel: ScopeLevel | undefined,
  resource: Resource,
) => {
  if (
    !scopeMatches({
      scopes: event.locals.authorization?.scopes,
      requiredScope: {
        scopeLevel,
        resource,
      },
    })
  ) {
    console.error(
      `[auth] Scope denied: ${scopeLevel ?? 'any'} on ${resource.type}:${resource.id}`,
      JSON.stringify(event.locals.authorization),
    );
    throw forbidden(
      'auth.scope.not-authorized',
    );
  }
};
