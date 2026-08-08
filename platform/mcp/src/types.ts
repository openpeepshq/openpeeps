export type McpProfile = 'community' | 'ops';

export type CreateOpenpeepsMcpServerOptions = {
  profile: McpProfile;
  token: string;
  /** Origin only — client appends `/api/openpeeps/core/v1`. */
  baseUrl: string;
};

export const COMMUNITY_TOOL_NAMES = [
  'list_groups',
  'get_group',
  'list_group_members',
  'list_posts',
  'get_post',
  'get_profile',
  'search',
  'list_reports',
  'get_report',
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
