export type ObjectType =
  | 'post'
  | 'group'
  | 'profile'
  | 'report'
  | 'community'
  | 'accessToken';

export const postRelationships = [
  'none',
  'local',
  'audience',
  'mentioned',
  'attendee',
  'collaborator',
] as const;

export const defaultGroupRoles = ['member', 'admin'] as const;

export const groupRelationships = [
  ...defaultGroupRoles,
  'none',
  'local',
  'invited',
] as const;

export const profileRelationships = [
  'none',
  'local',
  'self',
  'following',
  'followed-by',
  'blocked-by',
  'muted-by',
] as const;

export const reportRelationships = [
  'none',
  'local',
  'reporter',
  'reported',
  'acted-on',
] as const;

export const accessTokenRelationships = [
  'none',
  'local',
  'owner',
] as const;

export type PostRelationship = (typeof postRelationships)[number];
export type GroupRelationship = (typeof groupRelationships)[number];
export type ProfileRelationship = (typeof profileRelationships)[number];
export type ReportRelationship = (typeof reportRelationships)[number];
export type AccessTokenRelationship = (typeof accessTokenRelationships)[number];

export const postCapabilities = [
  'core-posts-read',
  'core-posts-update',
  'core-posts-delete',
  'core-posts-vote',
  'core-posts-react',
  'core-posts-rsvp',
  'core-posts-reply',
  'core-posts-jam-moderate',
  'core-posts-jam-speak',
  'core-posts-jam-read',
] as const;

export const groupCapabilities = [
  'core-groups-read',
  'core-groups-update',
  'core-groups-delete',
  'core-groups-join',
  'core-groups-leave',
  'core-groups-addMember',
  'core-groups-removeMember',
  'core-groups-changeMemberRole',
  'core-posts-create-note',
  'core-posts-create-event',
  'core-posts-create-poll',
  'core-posts-create-article',
] as const;

export const profileCapabilities = [
  'core-profiles-read',
  'core-profiles-update',
  'core-profiles-delete',
  'core-profiles-requestFollow',
  'core-profiles-follow',
  'core-profiles-unfollow',
  'core-profiles-block',
  'core-profiles-unblock',
  'core-profiles-mute',
  'core-profiles-unmute',
] as const;

export const reportCapabilities = [
  'core-reports-create',
  'core-reports-read',
] as const;

export const accessTokenCapabilities = [
  'core-serviceTokens-create',
  'core-serviceTokens-read',
  'core-serviceTokens-delete',
] as const;

export type PostCapability = (typeof postCapabilities)[number];
export type GroupCapability = (typeof groupCapabilities)[number];
export type ProfileCapability = (typeof profileCapabilities)[number];
export type ReportCapability = (typeof reportCapabilities)[number];
export type AccessTokenCapability = (typeof accessTokenCapabilities)[number];

export const roleCapabilities = [
  'core-local',
  'core-accounts-read',
  'core-accounts-update',
  'core-accounts-delete',
  'core-reports-create',
  'core-reports-update',
  'core-groups-create',
  'core-groups-read',
  'core-groups-delete',
  'core-groups-addMember',
  'core-groups-removeMember',
  'core-groups-changeMemberRole',
  'core-posts-create-note-local',
  'core-posts-create-note-public',
  'core-posts-create-note-direct',
  'core-posts-create-note-private',
  'core-posts-create-event-local',
  'core-posts-create-event-public',
  'core-posts-create-event-direct',
  'core-posts-create-event-private',
  'core-posts-create-poll-local',
  'core-posts-create-poll-public',
  'core-posts-create-poll-direct',
  'core-posts-create-poll-private',
  'core-posts-create-article-local',
  'core-posts-create-article-public',
  'core-posts-create-article-direct',
  'core-posts-create-article-private',
  'core-posts-read-local',
  'core-posts-announce',
  'core-posts-delete',
  'core-profiles-read',
  'core-profiles-roles-update',
  'core-profiles-delete',
  'core-profiles-suspend',
  'core-profiles-update',
  'core-profiles-impersonate',
  'core-analytics-read',
  'core-config-update',
  'core-config-read',
  'core-customization-read',
  'core-customization-update',
  'core-capabilities-read',
  'core-capabilities-update',
  'core-backups-create',
  'core-backups-read',
  'core-backups-download',
  'core-backups-restore',
  'core-db-access',
  'core-i18n-update',
  'core-logs-read',
  'core-roles-read',
  'core-roles-update',
  'core-maintenance-restart',
  'core-inviteLinks-create',
  'core-inviteLinks-read',
  'core-inviteLinks-update',
  'core-inviteLinks-delete',
  'core-serviceTokens-create',
  'core-serviceTokens-read',
  'core-serviceTokens-update',
  'core-serviceTokens-delete',
] as const;

export type RoleCapability = (typeof roleCapabilities)[number];
