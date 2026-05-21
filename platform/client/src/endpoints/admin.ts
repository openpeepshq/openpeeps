import { GroupWithMeta, ReportResolution, ReportWithMeta, RoleData } from "@openpeeps/common";

import { AdminServerStats } from "@openpeeps/common";

import { Role } from "@openpeeps/common";

import { AdminEmailQueueStats, AdminEmailQueueTestInput, AdminEmailTestInput, AdminJobDetail, ConfigData, ConfigDataWithDefaults, InviteLinkData, InviteLinkWithMeta, LogRow, ProfileWithMeta, Resource, SuccessResponse, TokenResponse } from "@openpeeps/common";

import { allpeepPayloadEndpoint } from "./helpers";

import { AccountData, PublicAccount } from "@openpeeps/common";
import { FetchClient } from "@openpeeps/fetch-client";
import { allpeepNoPayloadEndpoint } from "./helpers";

export const admin = (rawClient: FetchClient) => (
    {
        accounts: {
            list: allpeepNoPayloadEndpoint<PublicAccount[]>(rawClient, '/admin/accounts'),
            findById: allpeepNoPayloadEndpoint<PublicAccount, { id: string }>(
                rawClient,
                '/admin/accounts/:id',
            ),
            update: allpeepPayloadEndpoint<PublicAccount, Partial<AccountData>, { id: string }>(
                rawClient,
                '/admin/accounts/:id',
                'patch'
            ),
            delete: allpeepNoPayloadEndpoint<PublicAccount, { id: string }>(
                rawClient,
                '/admin/accounts/:id',
                'delete',
            ),
        },
        backups: {
            list: allpeepNoPayloadEndpoint<string[]>(rawClient, '/admin/backups'),
            create: allpeepNoPayloadEndpoint<SuccessResponse>(
                rawClient,
                '/admin/backups',
                'post',
            ),
            restore: allpeepPayloadEndpoint<SuccessResponse, File>(
                rawClient,
                '/admin/backups/restore',
                'post',
            ),
        },
        config: {
            read: allpeepNoPayloadEndpoint<
                ConfigDataWithDefaults,
                { namespace: string; name: string }
            >(rawClient, '/admin/config/:namespace/:name'),
            update: allpeepPayloadEndpoint<
                SuccessResponse,
                Partial<ConfigData>,
                { namespace: string; name: string }
            >(rawClient, '/admin/config/:namespace/:name', 'patch'),
        },
        configuration: {
            email: {
                sendTest: allpeepPayloadEndpoint<SuccessResponse, AdminEmailTestInput>(
                    rawClient,
                    '/admin/configuration/email/test',
                    'post',
                ),
            },
        },
        diagnostics: {
            email: {
                queueStats: allpeepNoPayloadEndpoint<AdminEmailQueueStats>(
                    rawClient,
                    '/admin/diagnostics/email/queue-stats',
                ),
                queueTest: allpeepPayloadEndpoint<SuccessResponse, AdminEmailQueueTestInput>(
                    rawClient,
                    '/admin/diagnostics/email/test',
                    'post',
                ),
            },
            jobs: {
                jobDetail: allpeepNoPayloadEndpoint<
                    AdminJobDetail,
                    { queue: string; jobId: string }
                >(rawClient, '/admin/diagnostics/jobs/:queue/:jobId'),
            },
        },
        db: {
            token: allpeepNoPayloadEndpoint<TokenResponse>(rawClient, '/admin/db/token'),
        },
        i18n: {
            read: allpeepNoPayloadEndpoint<{
                defaults: Resource;
                merged: Resource;
                overrides: Resource;
            }>(rawClient, '/admin/i18n'),
            update: allpeepPayloadEndpoint<SuccessResponse, Resource>(
                rawClient,
                '/admin/i18n/overrides',
                'put',
            ),
        },
        invites: {
            create: allpeepPayloadEndpoint<InviteLinkWithMeta, InviteLinkData>(
                rawClient,
                '/invite-links',
            ),
            list: allpeepNoPayloadEndpoint<InviteLinkWithMeta[]>(rawClient, '/invite-links'),
            activate: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
                rawClient,
                '/invite-links/:id/activate',
                'put',
            ),
            deactivate: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
                rawClient,
                '/invite-links/:id/deactivate',
                'put',
            ),
        },
        logs: {
            list: allpeepNoPayloadEndpoint<
                LogRow[],
                undefined,
                { date?: string }
            >(rawClient, '/admin/logs'),
        },
        posts: {
            pinGlobally: allpeepPayloadEndpoint<
                SuccessResponse,
                { postId: string }
            >(rawClient, '/admin/pinned-post', 'patch'),
            announce: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
                rawClient,
                '/admin/posts/:id/announce',
                'post',
            ),
        },
        profiles: {
            list: allpeepNoPayloadEndpoint<ProfileWithMeta[]>(
                rawClient,
                '/admin/profiles',
            ),
            listByAccount: allpeepNoPayloadEndpoint<
                ProfileWithMeta[],
                { id: string }
            >(rawClient, '/admin/profiles/by-account/:id'),
            delete: allpeepNoPayloadEndpoint<
                ProfileWithMeta,
                { id: string }
            >(rawClient, '/admin/profiles/:id', 'delete'),
            listRoles: allpeepNoPayloadEndpoint<Role[], { id: string }>(
                rawClient,
                '/admin/profiles/:id/roles',
            ),
            updateRoles: allpeepPayloadEndpoint<
                Role[],
                { roles: Role[] },
                { id: string }
            >(rawClient, '/admin/profiles/:id/roles', 'put'),
        },
        roles: {
            list: allpeepNoPayloadEndpoint<Role[]>(rawClient, '/admin/roles'),
            update: allpeepPayloadEndpoint<Role, RoleData, { roleId: string }>(
                rawClient,
                '/admin/roles/:roleId',
                'put',
            ),
        },
        stats: {
            general: allpeepNoPayloadEndpoint<AdminServerStats>(rawClient, '/admin/stats'),
        },
        reports: {
            list: allpeepNoPayloadEndpoint<ReportWithMeta[]>(
                rawClient,
                '/admin/reports',
            ),
            findById: allpeepNoPayloadEndpoint<ReportWithMeta, { reportId: string }>(
                rawClient,
                '/admin/reports/:reportId',
            ),
            resolve: allpeepPayloadEndpoint<
                SuccessResponse,
                { resolution: ReportResolution },
                { reportId: string }
            >(rawClient, '/admin/reports/:reportId/resolve', 'put'),
            reopen: allpeepNoPayloadEndpoint<SuccessResponse, { reportId: string }>(
                rawClient,
                '/admin/reports/:reportId/reopen',
                'put',
            ),
        },
        groups: {
            list: allpeepNoPayloadEndpoint<GroupWithMeta[]>(
                rawClient,
                '/admin/groups',
            ),
        },
    }
)