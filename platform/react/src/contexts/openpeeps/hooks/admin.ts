import { apiHook, noPayloadMutation } from '../helpers';

import type { openpeepsClient } from '@openpeeps/client';
import { payloadMutation } from '../helpers';

export const adminHooks = (client: ReturnType<typeof openpeepsClient>) => ({
  useAccountsList: () => apiHook(client.admin.accounts.list),
  useAccountById: (id: string) =>
    apiHook(client.admin.accounts.findById, { pathParams: { id } }),
  updateAccountAction: payloadMutation(client.admin.accounts.update, [
    ['admin', 'accounts'],
  ]),
  deleteAccountAction: noPayloadMutation(client.admin.accounts.delete, [
    ['admin', 'accounts'],
  ]),
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
  useGeneralStats: () => apiHook(client.admin.stats.general),
  usei18n: () => apiHook(client.admin.i18n.read),
  updateI18nAction: payloadMutation(client.admin.i18n.update, [
    ['admin', 'i18n'],
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
  useEmailQueueStats: () =>
    apiHook(client.admin.diagnostics.email.queueStats, {
      refetchInterval: 60_000,
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
});
export type AdminHooks = ReturnType<typeof adminHooks>;
