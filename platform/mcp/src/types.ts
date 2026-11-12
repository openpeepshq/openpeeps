export type McpProfile = 'community' | 'ops';

export type CreateOpenpeepsMcpServerOptions = {
  profile: McpProfile;
  token: string;
  /** Origin only — client appends `/api/openpeeps/core/v1`. */
  baseUrl: string;
};

export const COMMUNITY_TOOL_NAMES = [
  // Posts — read
  'list_posts',
  'get_post',
  'get_post_context',
  'list_post_reposts',
  'list_post_recordings',
  'list_my_bookmarks',
  'list_feed',
  'search',
  // Posts — write
  'create_post',
  'update_post',
  'delete_post',
  'react',
  'unreact',
  'bookmark',
  'unbookmark',
  'repost',
  'vote_on_poll',
  'create_event_rsvp',
  'manage_event_rsvp',
  // Events
  'list_my_events',
  'list_upcoming_events',
  // Groups
  'list_groups',
  'get_group',
  'list_group_members',
  'create_group',
  'update_group',
  'delete_group',
  'join_group',
  'leave_group',
  'add_group_member',
  'remove_group_member',
  'set_group_member_roles',
  // Profiles
  'get_profile',
  'get_current_profile',
  'list_followers',
  'list_following',
  'list_blocked',
  'follow_profile',
  'unfollow_profile',
  'block_profile',
  'unblock_profile',
  'follow_hashtag',
  'unfollow_hashtag',
  'update_profile',
  'update_profile_settings',
  'pin_post',
  // Conversations (direct messages)
  'list_conversations',
  'list_archived_conversations',
  'search_conversations',
  'get_conversation',
  'send_dm',
  'leave_conversation',
  // Reports
  'list_reports',
  'get_report',
  'create_report',
  // Notifications
  'list_notifications',
  'get_notification_stats',
  'mark_all_notifications_as_seen',
  // Jams
  'list_jams',
  'get_jam_state',
  'close_jam',
  'list_jam_events',
  'list_jam_attendance',
] as const;

export const OPS_TOOL_NAMES = [
  'admin_server_stats',
  'admin_list_logs',
  'admin_config_read',
  'admin_config_update',
  'admin_list_reports',
  'admin_resolve_report',
  'admin_list_profiles',
  'admin_list_accounts',
  'admin_list_backups',
  'admin_create_backup',
  'admin_email_queue_stats',
  'admin_job_detail',
  'admin_list_groups',
  'admin_delete_group',
] as const;

export type CommunityToolName = (typeof COMMUNITY_TOOL_NAMES)[number];
export type OpsToolName = (typeof OPS_TOOL_NAMES)[number];

export const toolNamesForProfile = (profile: McpProfile): readonly string[] =>
  profile === 'community' ? COMMUNITY_TOOL_NAMES : OPS_TOOL_NAMES;
