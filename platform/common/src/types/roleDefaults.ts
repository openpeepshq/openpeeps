import type { RoleData } from './models';

/**
 * One point in the history of the built-in role defaults. Entries are
 * immutable: when the defaults change, append a new entry dated with the
 * creation date. The last entry is always the current one — it is used for
 * seeding on server start and as the rebase target for customized roles.
 */
export interface RoleDefaultsVersion {
  /** ISO date the version was created. */
  version: string;
  roles: RoleData[];
}

/** Stamps the version onto the roles so a stored role records its baseline. */
const versionedRoles = (version: string, roles: RoleData[]): RoleData[] =>
  roles.map((role) => ({ ...role, baseVersion: version }));

const builtinRoles: RoleData[] = [
  {
    key: 'owner',
    displayName: 'Owner',
    capabilities: { add: ['*'], remove: [] },
    default: true,
    description: 'The owner of this community can do everything',
  },
  {
    key: 'admin',
    displayName: 'Admin',
    capabilities: {
      add: [
        'core-accounts-*',
        'core-reports-*',
        'core-groups-*',
        'core-posts-*',
        'core-profiles-*',
        'core-customization-*',
        'core-backups-*',
        'core-i18n-*',
        'core-logs-*',
        'core-roles-read',
        'core-maintenance-restart',
        'core-inviteLinks-*',
        'core-analytics-read',
        'core-plugins-*',
      ],
      remove: [],
    },
    default: true,
    description: 'An admin of the community',
  },
  {
    key: 'moderator',
    displayName: 'Moderator',
    capabilities: {
      add: [
        'core-posts-delete',
        'core-posts-pin-globally',
        'core-posts-announce',
        'core-profiles-suspend',
        'core-accounts-read',
        'core-profiles-read',
        'core-groups-read',
        'core-inviteLinks-read',
        'core-reports-read',
        'core-reports-update',
        'core-analytics-read',
        'core-local',
        'core-posts-create-*',
        'core-groups-create',
        'core-reports-create',
      ],
      remove: [],
    },
    default: true,
    description: 'A moderator of the community',
  },
  {
    key: 'member',
    displayName: 'Member',
    capabilities: {
      add: [
        'core-local',
        'core-posts-create-*',
        'core-groups-create',
        'core-reports-create',
      ],
      remove: [],
    },
    default: true,
    description: 'A member of the community',
  },
  {
    key: 'pendingmember',
    displayName: 'Pending Member',
    capabilities: {
      add: ['core-local'],
      remove: [],
    },
    default: true,
    description: 'A member of the community that has not been approved yet',
  },
  {
    key: 'limitedmember',
    displayName: 'Limited Member',
    capabilities: {
      add: [],
      remove: [],
    },
    default: true,
    description:
      'A member of the community that can only partcipate in group they are added to',
  },
];

const adminCanManageMedia = (roles: RoleData[]): RoleData[] =>
  roles.map((role) =>
    role.key === 'admin'
      ? {
          ...role,
          capabilities: {
            add: [...(role.capabilities?.add ?? []), 'core-media-*'],
            remove: [...(role.capabilities?.remove ?? [])],
          },
        }
      : role,
  );

/** Admins and moderators can see each other's online presence. */
const withPresenceCapability = (roles: RoleData[]): RoleData[] =>
  roles.map((role) =>
    role.key === 'admin' || role.key === 'moderator'
      ? {
          ...role,
          capabilities: {
            add: [...(role.capabilities?.add ?? []), 'core-presence-read'],
            remove: [...(role.capabilities?.remove ?? [])],
          },
        }
      : role,
  );

/**
 * Copy of the transform added by the community-highlights change (PR #1940,
 * issue #271), which appends its defaults entry (2026-11-06) with the same
 * base. The two PRs coordinate on merge order: this entry composes both
 * transforms so it is correct whichever order lands; once #1940 is merged,
 * drop this copy and reuse its function on rebase.
 */
const moderatorsCanHighlightPosts = (roles: RoleData[]): RoleData[] =>
  roles.map((role) =>
    role.key === 'moderator'
      ? {
          ...role,
          capabilities: {
            add: [...(role.capabilities?.add ?? []), 'core-posts-highlight'],
            remove: [...(role.capabilities?.remove ?? [])],
          },
        }
      : role,
  );

export const roleDefaultsHistory: RoleDefaultsVersion[] = [
  {
    version: '2026-10-06',
    roles: versionedRoles('2026-10-06', builtinRoles),
  },
  {
    version: '2026-10-13',
    roles: versionedRoles('2026-10-13', adminCanManageMedia(builtinRoles)),
  },
  {
    // New date (not 2026-11-06, taken by the community-highlights entry) so
    // both PRs can carry an entry with a unique id; see the
    // moderatorsCanHighlightPosts comment for the merge-order coordination.
    version: '2026-11-08',
    roles: versionedRoles(
      '2026-11-08',
      moderatorsCanHighlightPosts(
        withPresenceCapability(adminCanManageMedia(builtinRoles)),
      ),
    ),
  },
];

/** The current (last) version — the one in use. */
export const currentRoleDefaults =
  roleDefaultsHistory[roleDefaultsHistory.length - 1];

/**
 * Built-in instance roles of the current version, seeded on server start.
 * Also the reference for "restore defaults" in the admin capability matrix.
 */
export const defaultRoles = currentRoleDefaults.roles;

export const findRoleDefaultsVersion = (version: string) =>
  roleDefaultsHistory.find((entry) => entry.version === version);
