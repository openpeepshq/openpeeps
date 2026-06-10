import type {
  AccessTokenRelationship,
  AccountWithMeta,
  AuthorizationData,
  Capabilities,
  CapabilitiesConfig,
  GroupRelationship,
  PostRelationship,
  ProfileRelationship,
  ProfileWithMeta,
  PublicPost,
  PublicPostInput,
  PublicProfile,
  PublicReport,
  ReportRelationship,
  Role,
  AccessTokenWithMeta,
  GroupWithMeta,
  Resource,
  Scope,
} from '../types';
import { calculateRequiredScope, scopeMatches } from './scopeHelpers';

export const checkCapabilities = (
  neededCapabilities: string[],
  presentCapabilities: { add?: string[]; remove?: string[] } = {
    add: [],
    remove: [],
  },
) => {
  const containsCapability = (c: string, clist: string[]) =>
    !!clist?.find(
      (pc) => pc === c || (pc.includes('*') && c.startsWith(pc.split('*')[0])),
    );
  const missingCapabilities = neededCapabilities.filter(
    (c) =>
      containsCapability(c, presentCapabilities.remove ?? []) ||
      !containsCapability(c, presentCapabilities.add ?? []),
  );

  return {
    success: missingCapabilities.length === 0,
    missingCapabilities,
  };
};

export const mergeCapabilities = (
  capabilities?: Partial<Capabilities>[],
): Capabilities => {
  return {
    add: [...new Set(capabilities?.map((c) => c?.add || []).flat() ?? [])],
    remove: [
      ...new Set(capabilities?.map((c) => c?.remove || []).flat() ?? []),
    ],
  };
};

export const checkRoleCapabilities = (
  roles: Role[] = [],
  neededCapabilities: string[],
) =>
  checkCapabilities(
    neededCapabilities,
    mergeCapabilities(roles.map((r) => r.capabilities)),
  );

/** Any of these matching `roles` shows the Administration row (submenu is separate UX). */
export const ADMIN_SIDEBAR_MENU_CAPABILITIES = [
  'admin',
  'core-roles-read',
  'core-logs-read',
  'core-accounts-list',
  'core-backups-read',
  'core-analytics-read',
  'core-inviteLinks-read',
  'core-maintenance-restart',
  'core-config-read',
  'core-customization-read',
] as const;

export const hasAdminSidebarAccess = (roles: Role[] = []) =>
  ADMIN_SIDEBAR_MENU_CAPABILITIES.some((cap) =>
    checkRoleCapabilities(roles, [cap]).success,
  );

export const isLocal = (profile: ProfileWithMeta) =>
  checkRoleCapabilities(profile.roles, ['core-local']).success;

/**
 * Returns `['local', 'none']` when the caller is "trusted local" — either a local
 * profile or an authenticated service — and `['none']` otherwise.
 */
export const localOrNone = (
  authData: AuthorizationData,
): ['local', 'none'] | ['none'] => {
  if (authData.service) {
    return ['local', 'none'];
  }
  if (authData.profile && isLocal(authData.profile)) {
    return ['local', 'none'];
  }
  return ['none'];
};

export const getGroupRelationships = (
  authData: AuthorizationData,
  group: GroupWithMeta,
): [GroupRelationship, ...GroupRelationship[]] => {
  const { profile } = authData;
  if (profile) {
    return [
      'local',
      'none',
      ...(profile.memberships.find((m) => m.group.id === group.id)?.roles ?? []),
    ];
  }
  if (authData.service) {
    return ['local', 'none'];
  }
  return ['none'];
};


export const getProfileRelationships = (
  authData: AuthorizationData,
  otherProfile: PublicProfile,
): ProfileRelationship[] => {
  const { profile } = authData;
  if (profile && profile.id === otherProfile?.id) {
    return ['self', ...localOrNone(authData)];
  }
  const relationships: ProfileRelationship[] = localOrNone(authData);
  if (profile?.followers.map((f) => f.id).includes(otherProfile?.id)) {
    relationships.push('followed-by');
  }
  if (profile?.following.map((f) => f.id).includes(otherProfile?.id)) {
    relationships.push('following');
  }
  return relationships;
};

export const getPostRelationships = (
  authData: AuthorizationData,
  post: PublicPostInput,
): PostRelationship[] => {
  const { profile } = authData;
  const relationships: PostRelationship[] = [];

  if (['public', 'local'].includes(post.visibility)) {
    relationships.push(...localOrNone(authData));
  }


  if (profile && post.audience?.some((a) => a.id === profile.id)) {
    relationships.push('audience');
  }

  if (profile && post.mentions?.some((m) => m.profile.id === profile.id)) {
    relationships.push('mentioned');
  }

  if (
    profile &&
    post.entries?.some(
      (e) =>
        e.type === 'rsvp' &&
        e.profile.id === profile.id &&
        ['yes', 'tentative'].includes(e.data.response),
    )
  ) {
    relationships.push('attendee');
  }

  return relationships;
};

export const getReportRelationships = (
  authData: AuthorizationData,
  report: PublicReport,
): ReportRelationship[] => {
  const { profile } = authData;
  if (profile && report.reporterProfile.id === profile.id) {
    return [...localOrNone(authData), 'reporter'];
  }
  if (profile && report.reportedProfile.id === profile.id) {
    return [...localOrNone(authData), 'reported'];
  }
  return localOrNone(authData);
};

export const getAccessTokenRelationships = (
  authData: AuthorizationData,
  accessToken: AccessTokenWithMeta,
): AccessTokenRelationship[] => {
  const { profile } = authData;
  const relationships: AccessTokenRelationship[] = [...localOrNone(authData)];
  const ownerProfileId = accessToken.ownedBy?.id;
  if (ownerProfileId && profile?.id === ownerProfileId) {
    relationships.push('owner');
  }
  return relationships;
};

const getConfigCapabilities = (
  object: 'post' | 'profile' | 'report' | 'accessToken',
  relationships: (
    | PostRelationship
    | ProfileRelationship
    | ReportRelationship
    | AccessTokenRelationship
  )[],
  config: CapabilitiesConfig,
): Capabilities =>
  mergeCapabilities(
    relationships.map((r) => {
      const group = config[object] as Partial<
        Record<string, Capabilities | undefined>
      >;
      return group[r] ?? { add: [], remove: [] };
    }),
  );

const getGroupRelationshipCapabilities = (
  authData: AuthorizationData,
  group?: GroupWithMeta | null,
): Capabilities =>
  mergeCapabilities(
    group
      ? getGroupRelationships(authData, group).map(
        (r) => group.capabilities?.[r] ?? { add: [], remove: [] },
      )
      : [],
  );

export const getGroupCapabilitiesByRoles = (
  roles: string[] | undefined | null,
  group?: GroupWithMeta | null,
) =>
  mergeCapabilities(
    (roles ?? []).map((r) => group?.capabilities?.[r] ?? { add: [], remove: [] }),
  );

// Per-group powers (add member, post in group, moderate, …) come from the
// caller's relationship to the group (edge roles plus none/local), never from
// their instance role. Instance roles only gate group *creation*
// (`core-groups-create`), checked separately at the creation entry points.
export const getGroupCapabilities = (
  authData: AuthorizationData,
  group?: GroupWithMeta | null,
): Capabilities => getGroupRelationshipCapabilities(authData, group);

const getRoleCapabilities = (profile?: ProfileWithMeta): Capabilities =>
  mergeCapabilities(profile?.roles.map((r) => r.capabilities) ?? []);

export const getProfileCapabilities = (
  authData: AuthorizationData,
  targetProfile: PublicProfile,
  config: CapabilitiesConfig,
): Capabilities =>
  getConfigCapabilities(
    'profile',
    getProfileRelationships(authData, targetProfile),
    config,
  );

const getPostVisibilityCapabilities = (post: PublicPost, profile: ProfileWithMeta | undefined) => {
  switch (post.visibility) {
    case 'public':
      return { add: ['core-posts-read'], remove: [] };
    case 'direct':
      return {};
    // Group posts derive their capabilities from the group relationship
    // (`getGroupCapabilities`) and the author's `self` relationship only —
    // never from instance roles. This keeps per-group powers consistent with
    // every other group check (see getGroupCapabilities); instance roles only
    // gate group creation.
    case 'group':
      return {};
    default:
      return getRoleCapabilities(profile);
  }
}

const getScopedPostReadCapabilities = (
  authData: AuthorizationData,
  neededCapabilities: string[],
  post: PublicPost,
): Capabilities => {
  if (
    authData.profile ||
    post.visibility !== 'local' ||
    neededCapabilities.length !== 1 ||
    neededCapabilities[0] !== 'core-posts-read' ||
    !scopeMatches({
      scopes: authData.scopes,
      requiredScope: { scopeLevel: 'admin', resource: { type: 'posts', id: post.id } },
    })
  ) {
    return { add: [], remove: [] };
  }
  return { add: ['core-posts-read'], remove: [] };
};

export const getPostCapabilities = (
  authData: AuthorizationData,
  post: PublicPost,
  config: CapabilitiesConfig,
): Capabilities => mergeCapabilities([
  getPostVisibilityCapabilities(post, authData.profile),
  getConfigCapabilities('post', getPostRelationships(authData, post), config),
  getConfigCapabilities(
    'profile',
    getProfileRelationships(authData, post.profile),
    config,
  ),
  getGroupCapabilities(authData, post.group),
])


const getReportCapabilities = (
  authData: AuthorizationData,
  report: PublicReport,
  config: CapabilitiesConfig,
): Capabilities =>
  mergeCapabilities([
    getConfigCapabilities(
      'report',
      getReportRelationships(authData, report),
      config,
    ),
    getRoleCapabilities(authData.profile),
  ]);

const getAccessTokenCapabilities = (
  authData: AuthorizationData,
  accessToken: AccessTokenWithMeta,
  config: CapabilitiesConfig,
): Capabilities =>
  mergeCapabilities([
    getConfigCapabilities(
      'accessToken',
      getAccessTokenRelationships(authData, accessToken),
      config,
    ),
    getRoleCapabilities(authData.profile),
  ]);

const getAccountCapabilities = (
  authData: AuthorizationData,
  targetAccount: AccountWithMeta,
): Capabilities =>
  mergeCapabilities([
    authData.account?.id === targetAccount.id
      ? { add: ['core-accounts-update'], remove: [] }
      : { add: [], remove: [] },
    getRoleCapabilities(authData.profile),
  ]);

const checkCapabilitiesWithCalculatedScope = (
  capabilities: Capabilities,
  authData: AuthorizationData,
  neededCapabilities: string[],
  resource: Resource,
) => {
  const requiredScope = calculateRequiredScope({ resource, requiredCapabilities: neededCapabilities });
  return checkCapabilitiesWithExplicitScope(capabilities, authData, neededCapabilities, requiredScope);
}

const checkCapabilitiesWithExplicitScope = (
  capabilities: Capabilities,
  authData: AuthorizationData,
  neededCapabilities: string[],
  requiredScope: Scope,
) => {
  const capabilitiesResult = checkCapabilities(neededCapabilities, capabilities);
  const scopeResult = scopeMatches({ scopes: authData.scopes, requiredScope });
  return {
    success: capabilitiesResult.success && scopeResult,
    missingCapabilities: capabilitiesResult.missingCapabilities,
    missingScope: scopeResult ? undefined : requiredScope,
  };
}


export const checkGroupCapabilities = (
  authData: AuthorizationData,
  neededCapabilities: string[],
  group: GroupWithMeta,
) =>
  checkCapabilitiesWithCalculatedScope(
    getGroupCapabilities(authData, group),
    authData,
    neededCapabilities,
    { type: 'groups', id: group.id },
  );


export const checkPostCapabilities = (
  authData: AuthorizationData,
  neededCapabilities: string[],
  post: PublicPost,
  config: CapabilitiesConfig,
) =>
  checkCapabilitiesWithCalculatedScope(
    mergeCapabilities([
      getPostCapabilities(authData, post, config),
      getScopedPostReadCapabilities(authData, neededCapabilities, post),
    ]),
    authData,
    neededCapabilities,
    { type: 'posts', id: post.id },
  );

export const checkProfileCapabilities = (
  authData: AuthorizationData,
  neededCapabilities: string[],
  targetProfile: PublicProfile,
  config: CapabilitiesConfig,
) =>
  checkCapabilitiesWithCalculatedScope(
    getProfileCapabilities(authData, targetProfile, config),
    authData,
    neededCapabilities,
    { type: 'profiles', id: targetProfile.id },
  );

export const checkReportCapabilities = (
  authData: AuthorizationData,
  neededCapabilities: string[],
  report: PublicReport,
  config: CapabilitiesConfig,
) =>
  checkCapabilitiesWithCalculatedScope(
    getReportCapabilities(authData, report, config),
    authData,
    neededCapabilities,
    { type: 'reports', id: report.id },
  );

export const checkAccessTokenCapabilities = (
  authData: AuthorizationData,
  neededCapabilities: string[],
  accessToken: AccessTokenWithMeta,
  config: CapabilitiesConfig,
) =>
  checkCapabilitiesWithExplicitScope(
    getAccessTokenCapabilities(authData, accessToken, config),
    authData,
    neededCapabilities,
    { scopeLevel: 'admin', resource: { type: 'self' } },
  );

export const checkAccountCapabilities = (
  authData: AuthorizationData,
  neededCapabilities: string[],
  targetAccount: AccountWithMeta,
) =>
  checkCapabilitiesWithExplicitScope(
    getAccountCapabilities(authData, targetAccount),
    authData,
    neededCapabilities,
    { scopeLevel: 'admin', resource: { type: 'self' } },
  );
