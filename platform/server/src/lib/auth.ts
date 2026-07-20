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
import type { RequestEvent } from '@riddl/core';
import { authNeeded, forbidden } from './errors';
import {
  checkAccessTokenCapabilities,
  checkGroupCapabilities,
  checkPostCapabilities,
  checkProfileCapabilities,
  checkReportCapabilities,
  checkRoleCapabilities,
  scopeMatches as commonScopeMatches,
} from '@openpeeps/common/lib';
import { capabilitiesConfig, config } from '@openpeeps/core/config';
import { checkSubscription } from '@openpeeps/core/stripe';

export const loadCurrentProfile = async (
  authorization: Authorization,
): Promise<ProfileWithMeta | undefined> => {
  const id = authorization.identities.profile;
  if (id) {
    const profile = await findProfile(id);
    if (profile && !profile.deletedAt) {
      const parsedProfileResult = profileWithMetaSchema.safeParse(profile);
      if (parsedProfileResult.success) {
        return parsedProfileResult.data as ProfileWithMeta;
      }
      console.error('Invalid profile', parsedProfileResult.error);
    }
  }

  return undefined;
};

export const loadCurrentAccount = async (
  authorization: Authorization,
): Promise<AccountWithMeta | undefined> => {
  const id = authorization.identities.account;
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
  }
  return event.context.currentAccount;
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

  const { success, missingCapabilities, missingScope } = checkGroupCapabilities(
    event.context.authData,
    capabilities,
    group,
  );

  if (!success) {
    const scopeHint = missingScope
      ? ` (missing scope ${missingScope.scopeLevel}:${missingScope.resource.type})`
      : '';
    throw forbidden(
      `Missing capabilities: ${missingCapabilities.join(', ')}${scopeHint}`,
    );
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

  await ensureAccess(event);
  const { success, missingCapabilities } = checkPostCapabilities(
    event.context.authData,
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
    event.context.authData,
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
    event.context.authData,
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
    event.context.authData,
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
  options: {
    publiclyAccessible: boolean;
    subscriptionRequired: boolean;
  } = { publiclyAccessible: false, subscriptionRequired: true },
) => {
  const { publiclyAccessible, subscriptionRequired } = options;
  const profile = event.context.currentProfile;
  const account = event.context.currentAccount;

  if (
    !(profile?.type === 'local') &&
    !isService(event.context.authorization) &&
    !publiclyAccessible
  ) {
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

export const ensureAccess = async (
  event: RequestEvent,
  subscriptionRequired: boolean = true,
) => {
  const coreConfig = await config();
  return ensureProfileMaybe(event, {
    publiclyAccessible: coreConfig.server.publicContent,
    subscriptionRequired,
  });
};

/** @deprecated Use `ensureAccess` — kept for existing server endpoints. */
export const ensureProfileOrPublicCommunity = ensureAccess;

const isService = (authorization?: Authorization) =>
  !!authorization?.identities.service;

export const serviceScopeMatches = ({
  authorization,
  scopeLevel,
  resource,
}: {
  authorization?: Authorization;
  scopeLevel?: ScopeLevel;
  resource: Resource;
}) =>
  !!authorization &&
  isService(authorization) &&
  commonScopeMatches({
    scopes: authorization.scopes,
    requiredScope: {
      scopeLevel,
      resource,
    },
  });

/** Legacy scope check used by jam/post service authorization paths. */
export const scopeMatches = ({
  authorization,
  scope,
  resource,
}: {
  authorization?: Authorization | null;
  scope?: string;
  resource: Resource;
}) =>
  commonScopeMatches({
    scopes: authorization?.scopes,
    requiredScope: {
      scopeLevel: scope as ScopeLevel | undefined,
      resource,
    },
  });

export const ensureProfileOrGuest = async (
  event: RequestEvent,
  scopeLevel?: ScopeLevel | string,
  resource?: Resource,
): Promise<ProfileWithMeta> => {
  const normalizedScope =
    typeof scopeLevel === 'string' ? (scopeLevel as ScopeLevel) : scopeLevel;

  if (
    event.context.currentProfile &&
    (event.context.currentProfile.type === 'local' ||
      (event.context.currentProfile.type === 'guest' &&
        (!normalizedScope ||
          !resource ||
          commonScopeMatches({
            scopes: event.context.authorization?.scopes,
            requiredScope: {
              scopeLevel: normalizedScope,
              resource,
            },
          }))))
  ) {
    return event.context.currentProfile;
  }

  throw authNeeded('Valid profile needed');
};

export const ensureScope = async (
  event: RequestEvent,
  scopeLevel: ScopeLevel | undefined,
  resource: Resource,
) => {
  if (
    !commonScopeMatches({
      scopes: event.context.authorization?.scopes,
      requiredScope: {
        scopeLevel,
        resource,
      },
    })
  ) {
    console.error(
      `[auth] Scope denied: ${scopeLevel ?? 'any'} on ${resource.type}:${resource.id}`,
      JSON.stringify(event.context.authorization),
    );
    throw forbidden('auth.scope.not-authorized');
  }
};

/** Service tokens must identify as service before scope is checked. */
export const ensureServiceScope = async (
  event: RequestEvent,
  scopeLevel: ScopeLevel | undefined,
  resource: Resource,
) => {
  if (!isService(event.context.authorization)) {
    throw authNeeded('Service key needed');
  }
  await ensureScope(event, scopeLevel, resource);
};
