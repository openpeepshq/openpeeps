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

const adminCanManageFederation = (roles: RoleData[]): RoleData[] =>
  roles.map((role) =>
    role.key === 'admin'
      ? {
          ...role,
          capabilities: {
            add: [...(role.capabilities?.add ?? []), 'core-federation-manage'],
            remove: [...(role.capabilities?.remove ?? [])],
          },
        }
      : role,
  );

/**
 * Grant the ability to claim an *instance-scoped* (globally unique `/{slug}`)
 * article slug. The owner inherits it via its `*` capability, so only admin
 * and moderator need it spelled out here (admin would also pick it up from
 * `core-posts-*`, but it is named explicitly because owning the global slug
 * namespace is a meaningful, separately-grantable permission).
 */
const grantInstanceSlugToAdminAndModerator = (roles: RoleData[]): RoleData[] =>
  roles.map((role) =>
    role.key === 'admin' || role.key === 'moderator'
      ? {
          ...role,
          capabilities: {
            add: [
              ...(role.capabilities?.add ?? []),
              'core-posts-slug-instance',
            ],
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
    version: '2026-11-26',
    roles: versionedRoles(
      '2026-11-26',
      adminCanManageFederation(adminCanManageMedia(builtinRoles)),
    ),
  },
  {
    version: '2026-11-27',
    roles: versionedRoles(
      '2026-11-27',
      grantInstanceSlugToAdminAndModerator(
        adminCanManageFederation(adminCanManageMedia(builtinRoles)),
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
