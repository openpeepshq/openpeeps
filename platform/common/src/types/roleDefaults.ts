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

export const roleDefaultsHistory: RoleDefaultsVersion[] = [
  {
    version: '2026-10-06',
    roles: versionedRoles('2026-10-06', [
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
    ]),
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
