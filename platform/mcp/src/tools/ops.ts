import { McpServer } from '@modelcontextprotocol/server';
import { openpeepsClient } from '@openpeepshq/client';
import * as z from 'zod';
import { runTool, unwrap } from '../result.js';

const reportResolutionSchema = z.enum([
  'ignore',
  'remove',
  'warn',
  'ban',
  'other',
]);

export const registerOpsTools = (
  server: McpServer,
  client: ReturnType<typeof openpeepsClient>,
): void => {
  server.registerTool(
    'admin_server_stats',
    {
      description: 'Read admin server stats.',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.admin.stats.general())),
  );

  server.registerTool(
    'admin_list_logs',
    {
      description: 'List server log rows for a date (YYYY-MM-DD).',
      inputSchema: z.object({
        date: z.string().optional(),
      }),
    },
    async ({ date }) =>
      runTool(() =>
        unwrap(client.admin.logs.list({ queryParameters: { date } })),
      ),
  );

  server.registerTool(
    'admin_config_read',
    {
      description: 'Read an admin config value by namespace and name.',
      inputSchema: z.object({
        namespace: z.string().min(1),
        name: z.string().min(1),
      }),
    },
    async ({ namespace, name }) =>
      runTool(() =>
        unwrap(
          client.admin.config.read({
            pathParameters: { namespace, name },
          }),
        ),
      ),
  );

  server.registerTool(
    'admin_config_update',
    {
      description: 'Patch an admin config value by namespace and name.',
      inputSchema: z.object({
        namespace: z.string().min(1),
        name: z.string().min(1),
        data: z.record(z.string(), z.unknown()),
      }),
    },
    async ({ namespace, name, data }) =>
      runTool(() =>
        unwrap(
          client.admin.config.update(data as never, {
            pathParameters: { namespace, name },
          }),
        ),
      ),
  );

  server.registerTool(
    'admin_list_reports',
    {
      description: 'List all reports (admin).',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.admin.reports.list())),
  );

  server.registerTool(
    'admin_resolve_report',
    {
      description: 'Resolve a report with a resolution action (admin).',
      inputSchema: z.object({
        reportId: z.string().uuid(),
        resolution: reportResolutionSchema,
      }),
    },
    async ({ reportId, resolution }) =>
      runTool(() =>
        unwrap(
          client.admin.reports.resolve(
            { resolution },
            { pathParameters: { reportId } },
          ),
        ),
      ),
  );

  server.registerTool(
    'admin_list_profiles',
    {
      description: 'List profiles (admin).',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.admin.profiles.list())),
  );

  server.registerTool(
    'admin_list_accounts',
    {
      description: 'List accounts (admin).',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.admin.accounts.list())),
  );

  server.registerTool(
    'admin_list_backups',
    {
      description: 'List database backup archive names (admin).',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.admin.backups.list())),
  );

  server.registerTool(
    'admin_create_backup',
    {
      description: 'Create a new database backup (admin).',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.admin.backups.create())),
  );

  server.registerTool(
    'admin_email_queue_stats',
    {
      description: 'Read email queue diagnostics (admin).',
      inputSchema: z.object({}),
    },
    async () =>
      runTool(() => unwrap(client.admin.diagnostics.email.queueStats())),
  );

  server.registerTool(
    'admin_job_detail',
    {
      description: 'Read BullMQ job detail for a queue and job id (admin).',
      inputSchema: z.object({
        queue: z.string().min(1),
        jobId: z.string().min(1),
      }),
    },
    async ({ queue, jobId }) =>
      runTool(() =>
        unwrap(
          client.admin.diagnostics.jobs.jobDetail({
            pathParameters: { queue, jobId },
          }),
        ),
      ),
  );

  server.registerTool(
    'admin_list_groups',
    {
      description: 'List all groups (admin).',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.admin.groups.list())),
  );

  server.registerTool(
    'admin_delete_group',
    {
      description: 'Delete a group by id (admin; requires core-groups-delete).',
      inputSchema: z.object({
        groupId: z.string().uuid(),
      }),
    },
    async ({ groupId }) =>
      runTool(() =>
        unwrap(client.admin.groups.delete({ pathParameters: { groupId } })),
      ),
  );
};
