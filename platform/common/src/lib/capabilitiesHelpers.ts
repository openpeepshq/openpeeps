import type {
  AccountWithMeta,
  Capabilities,
  CapabilitiesConfig,
  Group,
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
} from '../types';

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
  neededCapabilities: string[],
  roles: Role[] = [],
) =>
  checkCapabilities(
    neededCapabilities,
    mergeCapabilities(roles.map((r) => r.capabilities)),
  );

export const isLocal = (profile: ProfileWithMeta) =>
  checkRoleCapabilities(['core-local'], profile.roles).success;

export const localOrNone = (
  profile: ProfileWithMeta | undefined,
): ['local', 'none'] | ['none'] =>
  profile ? (isLocal(profile) ? ['local', 'none'] : ['none']) : ['none'];

export const getGroupRelationships = (
  profile: ProfileWithMeta | undefined,
  group: Group,
): [GroupRelationship, ...GroupRelationship[]] => profile ?
    [
      'local',
      'none',
      ...(profile?.memberships.find((m) => m.group.id === group.id)?.roles ?? [])
    ] :
    ['none'];


export const getProfileRelationships = (
  profile: ProfileWithMeta | undefined,
  otherProfile: PublicProfile,
): ProfileRelationship[] => {
  if (profile && profile?.id === otherProfile?.id) {
    return ['self', ...localOrNone(profile)];
  }
  const relationships: ProfileRelationship[] = localOrNone(profile);
  if (profile?.followers.map((f) => f.id).includes(otherProfile?.id)) {
    relationships.push('followed-by');
  }
  if (profile?.following.map((f) => f.id).includes(otherProfile?.id)) {
    relationships.push('following');
  }
  return relationships;
};

export const getPostRelationships = (
  profile: ProfileWithMeta | undefined,
  post: PublicPostInput,
): PostRelationship[] => {
  const relationships: PostRelationship[] = [];

  if (['public', 'local'].includes(post.visibility)) {
    relationships.push(...localOrNone(profile));
  }


  if (post.audience?.some((a) => a.id === profile?.id)) {
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
  profile: ProfileWithMeta | undefined,
  report: PublicReport,
): ReportRelationship[] => {
  if (report.reporterProfile.id === profile?.id) {
    return [...localOrNone(profile), 'reporter'];
  }
  if (report.reportedProfile.id === profile?.id) {
    return [...localOrNone(profile), 'reported'];
  }
  return localOrNone(profile);
};

const getConfigCapabilities = (
  object: 'post' | 'profile' | 'report',
  relationships: (
    | PostRelationship
    | ProfileRelationship
    | ReportRelationship
  )[],
  config: CapabilitiesConfig,
): Capabilities =>
  mergeCapabilities(relationships.map((r) => config[object][r]));

export const getGroupCapabilities = (
  profile?: ProfileWithMeta,
  group?: Group | null,
) =>
  mergeCapabilities(
    group
      ? getGroupRelationships(profile, group).map(
        (r) => group.capabilities[r] ?? { add: [], remove: [] },
      )
      : [],
  );

export const getGroupCapabilitiesByRoles = (
  roles: string[] | undefined | null,
  group?: Group | null,
) =>
  mergeCapabilities(
    (roles ?? []).map((r) => group?.capabilities[r] ?? { add: [], remove: [] }),
  );

const getRoleCapabilities = (profile?: ProfileWithMeta): Capabilities =>
  mergeCapabilities(profile?.roles.map((r) => r.capabilities) ?? []);

export const getProfileCapabilities = (
  profile: ProfileWithMeta | undefined,
  targetProfile: PublicProfile,
  config: CapabilitiesConfig,
): Capabilities =>
  getConfigCapabilities(
    'profile',
    getProfileRelationships(profile, targetProfile),
    config,
  );

const getPostVisibilityCapabilities = (post: PublicPost, profile: ProfileWithMeta | undefined) => {
  switch (post.visibility) {
    case 'public':
      return { add: ['core-posts-read'], remove: [] };
    case 'direct':
      return {};
    default:
      return getRoleCapabilities(profile);
  }
}

const getPostCapabilities = (
  profile: ProfileWithMeta | undefined,
  post: PublicPost,
  config: CapabilitiesConfig,
): Capabilities => mergeCapabilities([
  getPostVisibilityCapabilities(post, profile),
  getConfigCapabilities('post', getPostRelationships(profile, post), config),
  getConfigCapabilities(
    'profile',
    getProfileRelationships(profile, post.profile),
    config,
  ),
  getGroupCapabilities(profile, post.group),
])


const getReportCapabilities = (
  profile: ProfileWithMeta | undefined,
  report: PublicReport,
  config: CapabilitiesConfig,
): Capabilities =>
  mergeCapabilities([
    getConfigCapabilities(
      'report',
      getReportRelationships(profile, report),
      config,
    ),
    getRoleCapabilities(profile),
  ]);

const getAccountCapabilities = (
  profile: ProfileWithMeta,
  account: AccountWithMeta,
  targetAccount: AccountWithMeta,
): Capabilities =>
  mergeCapabilities([
    account.id === targetAccount.id
      ? { add: ['core-accounts-update'], remove: [] }
      : { add: [], remove: [] },
    getRoleCapabilities(profile),
  ]);

export const checkGroupCapabilities = (
  neededCapabilities: string[],
  profile: ProfileWithMeta | undefined,
  group: Group,
) =>
  checkCapabilities(neededCapabilities, getGroupCapabilities(profile, group));

export const checkPostCapabilities = (
  neededCapabilities: string[],
  profile: ProfileWithMeta | undefined,
  post: PublicPost,
  config: CapabilitiesConfig,
) =>
  checkCapabilities(
    neededCapabilities,
    getPostCapabilities(profile, post, config),
  );

export const checkProfileCapabilities = (
  neededCapabilities: string[],
  profile: ProfileWithMeta | undefined,
  targetProfile: PublicProfile,
  config: CapabilitiesConfig,
) =>
  checkCapabilities(
    neededCapabilities,
    getProfileCapabilities(profile, targetProfile, config),
  );

export const checkReportCapabilities = (
  neededCapabilities: string[],
  profile: ProfileWithMeta | undefined,
  report: PublicReport,
  config: CapabilitiesConfig,
) =>
  checkCapabilities(
    neededCapabilities,
    getReportCapabilities(profile, report, config),
  );

export const checkAccountCapabilities = (
  neededCapabilities: string[],
  account: AccountWithMeta,
  profile: ProfileWithMeta,
  targetAccount: AccountWithMeta,
) =>
  checkCapabilities(
    neededCapabilities,
    getAccountCapabilities(profile, account, targetAccount),
  );
