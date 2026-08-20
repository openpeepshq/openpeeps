import { apiHook, noPayloadMutation, payloadMutation } from '../helpers';
import type { openpeepsClient } from '@openpeepshq/client';
import type {
  AdminServerStats,
  AnalyticsClicks,
  AnalyticsEngagement,
  AnalyticsGrowth,
  AnalyticsOverview,
  AnalyticsReportSettings,
  AnalyticsRetention,
  SuccessFailureResponse,
} from '@openpeepshq/common';
import type { UseQueryResult } from '@tanstack/react-query';

type OpenpeepsClientInstance = ReturnType<typeof openpeepsClient>;
type Query<T> = UseQueryResult<T, SuccessFailureResponse>;

// Split factories (like postFinders) so each ReturnType stays under the TS7056
// .d.ts limit once PublicPost grows (embedded `reposts`).

const adminAccounts = (client: OpenpeepsClientInstance) => ({
  useAccountsList: () => apiHook(client.admin.accounts.list),
  useAccountById: (id: string) =>
    apiHook(client.admin.accounts.findById, { pathParams: { id } }),
  updateAccountAction: payloadMutation(client.admin.accounts.update, [
    ['admin', 'accounts'],
  ]),
  deleteAccountAction: noPayloadMutation(client.admin.accounts.delete, [
    ['admin', 'accounts'],
  ]),
});
type AdminAccounts = ReturnType<typeof adminAccounts>;

const adminBackupsConfig = (client: OpenpeepsClientInstance) => ({
  useBackupsList: () => apiHook(client.admin.backups.list),
  createBackupAction: noPayloadMutation(client.admin.backups.create, [
    ['admin', 'backups'],
  ]),
  restoreBackupAction: payloadMutation(client.admin.backups.restore, [
    ['admin', 'backups'],
  ]),
  useConfigRead: (namespace: string, name: string) =>
    apiHook(client.admin.config.read, { pathParams: { namespace, name } }),
  updateConfigAction: payloadMutation(client.admin.config.update, [
    ['admin', 'config'],
    ['config'],
  ]),
  usei18n: () => apiHook(client.admin.i18n.read),
  updateI18nAction: payloadMutation(client.admin.i18n.update, [
    ['admin', 'i18n'],
  ]),
});
type AdminBackupsConfig = ReturnType<typeof adminBackupsConfig>;

const adminDbInvites = (client: OpenpeepsClientInstance) => ({
  useDbToken: () => apiHook(client.admin.db.token),
  useDbTables: () => apiHook(client.admin.db.tables),
  useDbRows: (table: string, query?: Record<string, string>) =>
    apiHook(client.admin.db.rows, {
      pathParams: { table },
      queryParams: query,
      enabled: !!table,
    }),
  updateDbRowAction: payloadMutation(client.admin.db.updateRow, [
    ['admin', 'db', 'rows'],
  ]),
  runDbSqlAction: payloadMutation(client.admin.db.runSql, [
    ['admin', 'db', 'sql'],
  ]),
  createInviteAction: payloadMutation(client.admin.invites.create, [
    ['admin', 'invites'],
  ]),
  useInvitesList: () => apiHook(client.admin.invites.list),
  activateInviteAction: noPayloadMutation(client.admin.invites.activate, [
    ['admin', 'invites'],
  ]),
  deactivateInviteAction: noPayloadMutation(client.admin.invites.deactivate, [
    ['admin', 'invites'],
  ]),
  useLogsList: (date?: string, refetchInterval?: number) =>
    apiHook(client.admin.logs.list, {
      queryParams: date ? { date } : undefined,
      refetchInterval,
    }),
});
type AdminDbInvites = ReturnType<typeof adminDbInvites>;

const adminPeopleContent = (client: OpenpeepsClientInstance) => ({
  pinPostGloballyAction: payloadMutation(client.admin.posts.pinGlobally, [
    ['admin', 'posts'],
    ['posts'],
    ['config'],
    ['server'],
  ]),
  announcePostAction: noPayloadMutation(client.admin.posts.announce, [
    ['admin', 'posts'],
    ['posts'],
  ]),
  useProfilesList: () => apiHook(client.admin.profiles.list),
  useProfilesByAccount: (id: string) =>
    apiHook(client.admin.profiles.listByAccount, { pathParams: { id } }),
  deleteProfileAction: noPayloadMutation(client.admin.profiles.delete, [
    ['admin', 'profiles'],
    ['profiles'],
  ]),
  useProfileRoles: (id: string) =>
    apiHook(client.admin.profiles.listRoles, { pathParams: { id } }),
  updateProfileRolesAction: payloadMutation(client.admin.profiles.updateRoles, [
    ['admin', 'profiles'],
    ['profiles'],
  ]),
  useRolesList: () => apiHook(client.admin.roles.list),
  updateRoleAction: payloadMutation(client.admin.roles.update, [
    ['admin', 'roles'],
  ]),
  useReportsList: () => apiHook(client.admin.reports.list),
  useReport: (reportId: string) =>
    apiHook(client.admin.reports.findById, { pathParams: { reportId } }),
  resolveReportAction: payloadMutation(client.admin.reports.resolve, [
    ['admin', 'reports'],
  ]),
  reopenReportAction: noPayloadMutation(client.admin.reports.reopen, [
    ['admin', 'reports'],
  ]),
  useAllGroupsList: () => apiHook(client.admin.groups.list),
  deleteGroupAction: noPayloadMutation(client.admin.groups.delete, [
    ['admin', 'groups'],
    ['groups'],
  ]),
});
type AdminPeopleContent = ReturnType<typeof adminPeopleContent>;

type AdminAnalytics = {
  useGeneralStats: () => Query<AdminServerStats>;
  useAnalyticsOverview: (
    query?: Record<string, string>,
  ) => Query<AnalyticsOverview>;
  useAnalyticsGrowth: (
    query?: Record<string, string>,
  ) => Query<AnalyticsGrowth>;
  useAnalyticsEngagement: (
    query?: Record<string, string>,
  ) => Query<AnalyticsEngagement>;
  useAnalyticsRetention: (
    query?: Record<string, string>,
  ) => Query<AnalyticsRetention>;
  useAnalyticsClicks: (
    query?: Record<string, string>,
  ) => Query<AnalyticsClicks>;
  useAnalyticsReportSettings: () => Query<AnalyticsReportSettings>;
  // Looser than inferred payloadMutation so PathParams variance does not block
  // the explicit AdminAnalytics annotation needed for TS7056.
  updateAnalyticsReportSettingsAction: (
    defaultPathParams?: undefined,
  ) => (input: AnalyticsReportSettings) => Promise<AnalyticsReportSettings>;
};

const adminAnalytics = (client: OpenpeepsClientInstance): AdminAnalytics => ({
  useGeneralStats: () => apiHook(client.admin.stats.general),
  useAnalyticsOverview: (query?: Record<string, string>) =>
    apiHook(client.admin.analytics.overview, { queryParams: query }),
  useAnalyticsGrowth: (query?: Record<string, string>) =>
    apiHook(client.admin.analytics.growth, { queryParams: query }),
  useAnalyticsEngagement: (query?: Record<string, string>) =>
    apiHook(client.admin.analytics.engagement, { queryParams: query }),
  useAnalyticsRetention: (query?: Record<string, string>) =>
    apiHook(client.admin.analytics.retention, { queryParams: query }),
  useAnalyticsClicks: (query?: Record<string, string>) =>
    apiHook(client.admin.analytics.clicks, { queryParams: query }),
  useAnalyticsReportSettings: () =>
    apiHook(client.admin.analytics.reportSettings.read),
  updateAnalyticsReportSettingsAction: payloadMutation(
    client.admin.analytics.reportSettings.update,
    [['admin', 'analytics', 'reportSettings']],
  ) as AdminAnalytics['updateAnalyticsReportSettingsAction'],
});

const adminDiagnostics = (client: OpenpeepsClientInstance) => ({
  useEmailQueueStats: () =>
    apiHook(client.admin.diagnostics.email.queueStats, {
      refetchInterval: 60_000,
    }),
  usePerformanceStats: () =>
    apiHook(client.admin.diagnostics.performance, {
      refetchInterval: 15_000,
    }),
  useJobDetail: (queue: string, jobId: string) =>
    apiHook(client.admin.diagnostics.jobs.jobDetail, {
      pathParams: { queue, jobId },
      enabled: !!queue && !!jobId,
    }),
  sendTestEmailAction: payloadMutation(
    client.admin.configuration.email.sendTest,
    [['admin', 'diagnostics', 'email']],
  ),
  queueTestEmailAction: payloadMutation(
    client.admin.diagnostics.email.queueTest,
    [['admin', 'diagnostics', 'email']],
  ),
  useServiceAccessTokens: () => apiHook(client.admin.serviceAccessTokens.list),
  createServiceAccessTokenAction: payloadMutation(
    client.admin.serviceAccessTokens.create,
    [['admin', 'serviceAccessTokens']],
  ),
  revokeServiceAccessTokenAction: noPayloadMutation(
    client.admin.serviceAccessTokens.revoke,
    [['admin', 'serviceAccessTokens']],
  ),
  usePluginsList: () => apiHook(client.admin.plugins.list),
  installPluginAction: payloadMutation(client.admin.plugins.install, [
    ['admin', 'plugins'],
  ]),
  uninstallPluginAction: noPayloadMutation(client.admin.plugins.uninstall, [
    ['admin', 'plugins'],
  ]),
  updatePluginStateAction: payloadMutation(client.admin.plugins.update, [
    ['admin', 'plugins'],
  ]),
  reloadPluginsAction: noPayloadMutation(client.admin.plugins.reload, [
    ['admin', 'plugins'],
  ]),
});
type AdminDiagnostics = ReturnType<typeof adminDiagnostics>;

export type AdminHooks = AdminAccounts &
  AdminBackupsConfig &
  AdminDbInvites &
  AdminPeopleContent &
  AdminAnalytics &
  AdminDiagnostics;

export const adminHooks = (client: OpenpeepsClientInstance): AdminHooks => ({
  ...adminAccounts(client),
  ...adminBackupsConfig(client),
  ...adminDbInvites(client),
  ...adminPeopleContent(client),
  ...adminAnalytics(client),
  ...adminDiagnostics(client),
});
