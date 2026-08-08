import { McpServer } from '@modelcontextprotocol/server';
import { openpeepsClient } from '@openpeepshq/client';
import * as z from 'zod';
import { runTool, unwrap } from '../result.js';

const limitSchema = z.number().int().positive().max(100).optional();

export const registerCommunityTools = (
  server: McpServer,
  client: ReturnType<typeof openpeepsClient>,
): void => {
  server.registerTool(
    'list_groups',
    {
      description: 'List groups visible to the authenticated identity.',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.groups.list())),
  );

  server.registerTool(
    'get_group',
    {
      description: 'Get a group by id or handle.',
      inputSchema: z
        .object({
          id: z.string().uuid().optional(),
          handle: z.string().min(1).optional(),
        })
        .refine((v) => Boolean(v.id || v.handle), {
          message: 'Provide id or handle',
        }),
    },
    async ({ id, handle }) =>
      runTool(() =>
        unwrap(
          id
            ? client.groups.findById({ pathParameters: { id } })
            : client.groups.findByHandle({
                pathParameters: { handle: handle! },
              }),
        ),
      ),
  );

  server.registerTool(
    'list_group_members',
    {
      description: 'List members of a group.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.groups.members({ pathParameters: { id } }))),
  );

  server.registerTool(
    'list_posts',
    {
      description:
        'List posts. Optionally filter by group, profile, or hashtag.',
      inputSchema: z.object({
        groupId: z.string().uuid().optional(),
        profileId: z.string().uuid().optional(),
        hashtag: z.string().min(1).optional(),
        limit: limitSchema,
        start: z.string().optional(),
      }),
    },
    async ({ groupId, profileId, hashtag, limit, start }) =>
      runTool(() => {
        const queryParameters = { limit, start };
        if (groupId) {
          return unwrap(
            client.posts.listByGroup({
              pathParameters: { id: groupId },
              queryParameters,
            }),
          );
        }
        if (profileId) {
          return unwrap(
            client.posts.listByProfile({
              pathParameters: { id: profileId },
              queryParameters,
            }),
          );
        }
        if (hashtag) {
          return unwrap(
            client.posts.listByHashtag({
              pathParameters: { hashtag },
              queryParameters,
            }),
          );
        }
        return unwrap(client.posts.list({ queryParameters }));
      }),
  );

  server.registerTool(
    'get_post',
    {
      description: 'Get a post by id.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.posts.findById({ pathParameters: { id } }))),
  );

  server.registerTool(
    'get_profile',
    {
      description: 'Get a profile by id or handle.',
      inputSchema: z
        .object({
          id: z.string().uuid().optional(),
          handle: z.string().min(1).optional(),
        })
        .refine((v) => Boolean(v.id || v.handle), {
          message: 'Provide id or handle',
        }),
    },
    async ({ id, handle }) =>
      runTool(() =>
        unwrap(
          id
            ? client.profiles.findById({ pathParameters: { id } })
            : client.profiles.findByHandle({
                pathParameters: { handle: handle! },
              }),
        ),
      ),
  );

  server.registerTool(
    'search',
    {
      description: 'Search posts, profiles, groups, events, jams, or counts.',
      inputSchema: z.object({
        q: z.string().min(1),
        type: z.enum([
          'posts',
          'profiles',
          'groups',
          'events',
          'jams',
          'counts',
        ]),
        limit: limitSchema,
        offset: z.number().int().nonnegative().optional(),
      }),
    },
    async ({ q, type, limit, offset }) =>
      runTool(() => {
        const queryParameters = { q, limit, offset };
        switch (type) {
          case 'posts':
            return unwrap(client.search.posts({ queryParameters }));
          case 'profiles':
            return unwrap(client.search.profiles({ queryParameters }));
          case 'groups':
            return unwrap(client.search.groups({ queryParameters }));
          case 'events':
            return unwrap(client.search.events({ queryParameters }));
          case 'jams':
            return unwrap(client.search.jams({ queryParameters }));
          case 'counts':
            return unwrap(client.search.counts({ queryParameters }));
        }
      }),
  );

  server.registerTool(
    'list_reports',
    {
      description:
        'List reports visible to the authenticated identity (member-scoped).',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.reports.list())),
  );

  server.registerTool(
    'get_report',
    {
      description: 'Get a report by id (member-scoped).',
      inputSchema: z.object({
        reportId: z.string().uuid(),
      }),
    },
    async ({ reportId }) =>
      runTool(() =>
        unwrap(client.reports.findById({ pathParameters: { reportId } })),
      ),
  );
};
