import { apiHook, noPayloadMutation } from "../helpers";

import type { openpeepsClient } from "@openpeeps/client";
import { payloadMutation } from "../helpers";

export const adminHooks = (client: ReturnType<typeof openpeepsClient>,) => ({
    useAccountsList: () => apiHook(client.admin.accounts.list),
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
    useLogsList: () => apiHook(client.admin.logs.list),
    pinPostGloballyAction: payloadMutation(client.admin.posts.pinGlobally, [
        ['admin', 'posts'],
        ['posts'],
        ['config'],
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
    useProfileRoles: () => apiHook(client.admin.profiles.listRoles),
    updateProfileRolesAction: payloadMutation(
        client.admin.profiles.updateRoles,
        [['admin', 'profiles'], ['profiles']]
    ),
    useRolesList: () => apiHook(client.admin.roles.list),
    useGeneralStats: () => apiHook(client.admin.stats.general),
    usei18n: () => apiHook(client.admin.i18n.read),
    useReportsList: () => apiHook(client.admin.reports.list),
    useReport: (reportId: string) => apiHook(client.admin.reports.findById, { pathParams: { reportId } }),
    resolveReportAction: payloadMutation(
        client.admin.reports.resolve,
        [['admin', 'reports']]
    ),
    reopenReportAction: noPayloadMutation(client.admin.reports.reopen, [
        ['admin', 'reports'],
    ]),
    // updatei18nAction: payloadMutation(client.admin.i18n.update, [['admin', 'i18n']]),
    useAllGroupsList: () => apiHook(client.admin.groups.list),
});
export type AdminHooks = ReturnType<typeof adminHooks>;