import {
  AccessToken,
  AdminGroup,
  ReportResolution,
  ReportWithMeta,
  RoleData,
} from '@openpeepshq/common';

import {
  AdminServerStats,
  AnalyticsBackfillInput,
  AnalyticsBackfillResponse,
  AnalyticsDateQuery,
  AnalyticsEngagement,
  AnalyticsGrowth,
  AnalyticsOverview,
  AnalyticsReportSettings,
  AnalyticsRetention,
} from '@openpeepshq/common';

import { Role } from '@openpeepshq/common';

import {
  AccessTokenCreationData,
  AdminEmailQueueStats,
  AdminEmailQueueTestInput,
  AdminEmailTestInput,
  AdminJobDetail,
  AdminPerformanceStats,
  ConfigData,
  ConfigDataWithDefaults,
  ExplorerRowsResponse,
  ExplorerSqlInput,
  ExplorerSqlResponse,
  ExplorerTablesResponse,
  ExplorerUpdateRowInput,
  ExplorerUpdateRowResponse,
  InviteLinkData,
  InviteLinkWithMeta,
  LogRow,
  ProfileWithMeta,
  PublicAccessToken,
  Resource,
  SuccessResponse,
  TokenResponse,
} from '@openpeepshq/common';

import { allpeepPayloadEndpoint } from './helpers';

import { AccountData, PublicAccount } from '@openpeepshq/common';
import { FetchClient } from '@openpeepshq/fetch-client';
import { allpeepNoPayloadEndpoint } from './helpers';

export type ExplorerRowsQuery = Record<string, string>;

export const admin = (rawClient: FetchClient) => ({
  accounts: {
    list: allpeepNoPayloadEndpoint<PublicAccount[]>(
      rawClient,
      '/admin/accounts',
    ),
    findById: allpeepNoPayloadEndpoint<PublicAccount, { id: string }>(
      rawClient,
      '/admin/accounts/:id',
    ),
    update: allpeepPayloadEndpoint<
      PublicAccount,
      Partial<AccountData>,
      { id: string }
    >(rawClient, '/admin/accounts/:id', 'patch'),
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
      queueTest: allpeepPayloadEndpoint<
        SuccessResponse,
        AdminEmailQueueTestInput
      >(rawClient, '/admin/diagnostics/email/test', 'post'),
    },
    jobs: {
      jobDetail: allpeepNoPayloadEndpoint<
        AdminJobDetail,
        { queue: string; jobId: string }
      >(rawClient, '/admin/diagnostics/jobs/:queue/:jobId'),
    },
    performance: allpeepNoPayloadEndpoint<AdminPerformanceStats>(
      rawClient,
      '/admin/diagnostics/performance',
    ),
  },
  db: {
    token: allpeepNoPayloadEndpoint<TokenResponse>(
      rawClient,
      '/admin/db/token',
    ),
    tables: allpeepNoPayloadEndpoint<ExplorerTablesResponse>(
      rawClient,
      '/admin/db/tables',
    ),
    rows: allpeepNoPayloadEndpoint<
      ExplorerRowsResponse,
      { table: string },
      ExplorerRowsQuery
    >(rawClient, '/admin/db/tables/:table/rows'),
    updateRow: allpeepPayloadEndpoint<
      ExplorerUpdateRowResponse,
      ExplorerUpdateRowInput,
      { table: string }
    >(rawClient, '/admin/db/tables/:table/rows', 'put'),
    exportCsv: async (table: string, query?: ExplorerRowsQuery) => {
      const params = new URLSearchParams();
      if (query) {
        for (const [key, value] of Object.entries(query)) {
          if (value != null && value !== '') {
            params.set(key, String(value));
          }
        }
      }
      const qs = params.toString();
      const path = `/admin/db/tables/${encodeURIComponent(table)}/export${qs ? `?${qs}` : ''}`;
      const response = await rawClient.get(path);
      if (!response.ok) {
        throw { ...(await response.json()), status: response.status };
      }
      return response.text();
    },
    runSql: allpeepPayloadEndpoint<ExplorerSqlResponse, ExplorerSqlInput>(
      rawClient,
      '/admin/db/sql',
      'post',
    ),
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
    list: allpeepNoPayloadEndpoint<InviteLinkWithMeta[]>(
      rawClient,
      '/invite-links',
    ),
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
    list: allpeepNoPayloadEndpoint<LogRow[], undefined, { date?: string }>(
      rawClient,
      '/admin/logs',
    ),
  },
  posts: {
    pinGlobally: allpeepPayloadEndpoint<SuccessResponse, { postId: string }>(
      rawClient,
      '/admin/pinned-post',
      'patch',
    ),
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
    exportCsv: async () => {
      const response = await rawClient.get('/admin/profiles/export');

      if (!response.ok) {
        throw { ...(await response.json()), status: response.status };
      }

      return response.text();
    },
    listByAccount: allpeepNoPayloadEndpoint<ProfileWithMeta[], { id: string }>(
      rawClient,
      '/admin/profiles/by-account/:id',
    ),
    delete: allpeepNoPayloadEndpoint<ProfileWithMeta, { id: string }>(
      rawClient,
      '/admin/profiles/:id',
      'delete',
    ),
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
    general: allpeepNoPayloadEndpoint<AdminServerStats>(
      rawClient,
      '/admin/stats',
    ),
  },
  analytics: {
    overview: allpeepNoPayloadEndpoint<
      AnalyticsOverview,
      undefined,
      AnalyticsDateQuery
    >(rawClient, '/admin/analytics/overview'),
    growth: allpeepNoPayloadEndpoint<
      AnalyticsGrowth,
      undefined,
      AnalyticsDateQuery
    >(rawClient, '/admin/analytics/growth'),
    engagement: allpeepNoPayloadEndpoint<
      AnalyticsEngagement,
      undefined,
      AnalyticsDateQuery
    >(rawClient, '/admin/analytics/engagement'),
    retention: allpeepNoPayloadEndpoint<
      AnalyticsRetention,
      undefined,
      AnalyticsDateQuery
    >(rawClient, '/admin/analytics/retention'),
    reportSettings: {
      read: allpeepNoPayloadEndpoint<AnalyticsReportSettings>(
        rawClient,
        '/admin/analytics/report-settings',
      ),
      update: allpeepPayloadEndpoint<
        AnalyticsReportSettings,
        AnalyticsReportSettings
      >(rawClient, '/admin/analytics/report-settings', 'put'),
    },
    export: allpeepNoPayloadEndpoint<
      {
        filename: string;
        contentType: string;
        content: string;
        encoding: 'utf8' | 'base64';
      },
      undefined,
      AnalyticsDateQuery & { format?: 'csv' | 'pdf' }
    >(rawClient, '/admin/analytics/export'),
    backfill: allpeepPayloadEndpoint<
      AnalyticsBackfillResponse,
      AnalyticsBackfillInput
    >(rawClient, '/admin/analytics/backfill', 'post'),
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
    list: allpeepNoPayloadEndpoint<AdminGroup[]>(rawClient, '/admin/groups'),
    delete: allpeepNoPayloadEndpoint<SuccessResponse, { groupId: string }>(
      rawClient,
      '/admin/groups/:groupId',
      'delete',
    ),
  },
  serviceAccessTokens: {
    list: allpeepNoPayloadEndpoint<PublicAccessToken[]>(
      rawClient,
      '/admin/service-access-tokens',
    ),
    create: allpeepPayloadEndpoint<AccessToken, AccessTokenCreationData>(
      rawClient,
      '/admin/service-access-tokens',
      'post',
    ),
    revoke: allpeepNoPayloadEndpoint<
      SuccessResponse,
      { accessTokenId: string }
    >(rawClient, '/admin/service-access-tokens/:accessTokenId', 'delete'),
  },
});
