import { RoleData } from '@openpeeps/common/types';

export const defaultRoles: RoleData[] = [
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
