import { McpServer } from '@modelcontextprotocol/server';
import { openpeepsClient } from '@openpeepshq/client';
import { postDataUnionSchema } from '@openpeepshq/common';
import * as z from '@openpeepshq/common/zod';
import { runTool, unwrap } from '../result.js';

const limitSchema = z.number().int().positive().max(100).optional();
const offsetSchema = z.number().int().nonnegative().optional();

/** Handle for a person or group: 1–64 letters, numbers, underscores, dots, or hyphens. */
const handleSchema = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-zA-Z0-9_.-]+$/)
  .optional();

const idOrHandleSchema = z
  .object({
    id: z.string().uuid().optional(),
    handle: handleSchema,
  })
  .refine((v) => Boolean(v.id || v.handle), {
    message: 'Provide id or handle',
  });

/** Group roles usable when managing member roles. */
const memberRoleSchema = z.enum(['member', 'moderator', 'admin', 'owner']);

const notificationSettingsSchema = z.object({
  create: z.boolean(),
  push: z.boolean(),
  email: z.boolean(),
});

export const registerCommunityTools = (
  server: McpServer,
  client: ReturnType<typeof openpeepsClient>,
): void => {
  // ------------------------------------------------------------------
  // Posts — read
  // ------------------------------------------------------------------

  server.registerTool(
    'list_posts',
    {
      description:
        'List recent posts, optionally filtered by group, profile, or hashtag.',
      inputSchema: z.object({
        type: z
          .enum(['note', 'question', 'event', 'article', 'resource'])
          .optional(),
        groupId: z.string().uuid().optional(),
        profileId: z.string().uuid().optional(),
        hashtag: z.string().min(1).optional(),
        limit: limitSchema,
        start: z.string().optional(),
      }),
    },
    async ({ type, groupId, profileId, hashtag, limit, start }) =>
      runTool(() => {
        const queryParameters = { limit, start };
        switch (type) {
          case 'note':
          case 'question':
          case 'event':
          case 'article':
          case 'resource':
            return unwrap(
              client.posts.listByType({
                pathParameters: { type },
                queryParameters,
              }),
            );
          default:
            if (groupId)
              return unwrap(
                client.posts.listByGroup({
                  pathParameters: { id: groupId },
                  queryParameters,
                }),
              );
            if (profileId)
              return unwrap(
                client.posts.listByProfile({
                  pathParameters: { id: profileId },
                  queryParameters,
                }),
              );
            if (hashtag)
              return unwrap(
                client.posts.listByHashtag({
                  pathParameters: { hashtag },
                  queryParameters,
                }),
              );
            return unwrap(client.posts.list({ queryParameters }));
        }
      }),
  );

  server.registerTool(
    'get_post',
    {
      description: 'Open a post by id.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.posts.findById({ pathParameters: { id } }))),
  );

  server.registerTool(
    'get_post_context',
    {
      description: 'Open a post with its immediate context (replies, reposts).',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.posts.context({ pathParameters: { id } }))),
  );

  server.registerTool(
    'list_post_reposts',
    {
      description: 'List posts that reposted the given post.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.posts.reposts({ pathParameters: { id } }))),
  );

  server.registerTool(
    'list_post_recordings',
    {
      description: 'List jam recordings attached to a jam post.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.posts.recordings({ pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'list_my_bookmarks',
    {
      description: 'List the authenticated identity’s bookmarked posts.',
      inputSchema: z.object({
        limit: limitSchema,
        start: z.string().optional(),
      }),
    },
    async ({ limit, start }) =>
      runTool(() =>
        unwrap(
          client.posts.listBookmarks({
            queryParameters: { limit, start },
          }),
        ),
      ),
  );

  server.registerTool(
    'list_feed',
    {
      description:
        'List posts from a feed: my activity, the local community, upcoming/current/past events or jams.',
      inputSchema: z.object({
        feed: z.enum([
          'my',
          'local',
          'events_upcoming',
          'events_current',
          'events_past',
          'events_my_upcoming',
          'events_my_current',
          'events_my_past',
          'jams_upcoming',
          'jams_past',
          'jams_my_upcoming',
          'jams_my_past',
        ]),
        limit: limitSchema,
        start: z.string().optional(),
      }),
    },
    async ({ feed, limit, start }) =>
      runTool(() => {
        const queryParameters = { limit, start };
        switch (feed) {
          case 'my':
            return unwrap(client.posts.feeds.my({ queryParameters }));
          case 'local':
            return unwrap(client.posts.feeds.local({ queryParameters }));
          case 'events_upcoming':
            return unwrap(
              client.posts.feeds.events.upcoming({ queryParameters }),
            );
          case 'events_current':
            return unwrap(
              client.posts.feeds.events.current({ queryParameters }),
            );
          case 'events_past':
            return unwrap(client.posts.feeds.events.past({ queryParameters }));
          case 'events_my_upcoming':
            return unwrap(
              client.posts.feeds.events.my.upcoming({ queryParameters }),
            );
          case 'events_my_current':
            return unwrap(
              client.posts.feeds.events.my.current({ queryParameters }),
            );
          case 'events_my_past':
            return unwrap(
              client.posts.feeds.events.my.past({ queryParameters }),
            );
          case 'jams_upcoming':
            return unwrap(
              client.posts.feeds.jams.upcoming({ queryParameters }),
            );
          case 'jams_past':
            return unwrap(client.posts.feeds.jams.past({ queryParameters }));
          case 'jams_my_upcoming':
            return unwrap(
              client.posts.feeds.jams.my.upcoming({ queryParameters }),
            );
          case 'jams_my_past':
            return unwrap(client.posts.feeds.jams.my.past({ queryParameters }));
        }
      }),
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
        offset: offsetSchema,
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

  // ------------------------------------------------------------------
  // Posts — write
  // ------------------------------------------------------------------

  server.registerTool(
    'create_post',
    {
      description:
        'Create a post (note, poll, event, article, or resource). Set visibility to public, unlisted, or private, and optionally target a group. Direct visibility is not supported here.',
      inputSchema: z.object({
        visibility: z.enum(['public', 'unlisted', 'private']),
        type: z.enum(['note', 'question', 'event', 'article', 'resource']),
        data: postDataUnionSchema,
        inReplyToId: z.string().uuid().nullable().optional(),
        groupId: z.string().uuid().nullable().optional(),
      }),
    },
    async (input) =>
      runTool(() =>
        unwrap(
          client.posts.create({
            visibility: input.visibility,
            type: input.type,
            data: input.data,
            inReplyToId: input.inReplyToId,
            groupId: input.groupId,
          }),
        ),
      ),
  );

  server.registerTool(
    'update_post',
    {
      description:
        'Update the content of a post you created. `data` replaces the post body; include the same type.',
      inputSchema: z.object({
        id: z.string().uuid(),
        data: postDataUnionSchema,
      }),
    },
    async ({ id, data }) =>
      runTool(() =>
        unwrap(client.posts.update(data, { pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'delete_post',
    {
      description: 'Delete a post you created.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.posts.delete({ pathParameters: { id } }))),
  );

  server.registerTool(
    'react',
    {
      description: 'React to a post. The only supported reaction is 👍.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(
          client.posts.react({ reaction: '👍' }, { pathParameters: { id } }),
        ),
      ),
  );

  server.registerTool(
    'unreact',
    {
      description: 'Remove your reaction from a post.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.posts.retractReaction({ pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'bookmark',
    {
      description: 'Bookmark a post.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.posts.bookmark({ pathParameters: { id } }))),
  );

  server.registerTool(
    'unbookmark',
    {
      description: 'Remove a bookmark from a post.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.posts.unbookmark({ pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'repost',
    {
      description: 'Repost (boost) a post to your followers.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.posts.repost({ pathParameters: { id } }))),
  );

  server.registerTool(
    'vote_on_poll',
    {
      description:
        'Vote on a poll. Provide the indices (0-based) of the selected options.',
      inputSchema: z.object({
        id: z.string().uuid(),
        selection: z.number().int().nonnegative().array().min(1),
      }),
    },
    async ({ id, selection }) =>
      runTool(() =>
        unwrap(client.posts.vote({ selection }, { pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'create_event_rsvp',
    {
      description:
        'RSVP to an event. response is yes, no, tentative, or removed. For recurring events, supply recurrenceIds (ISO datetimes) to apply to specific occurrences.',
      inputSchema: z.object({
        id: z.string().uuid(),
        response: z.enum(['yes', 'no', 'tentative', 'removed']),
        recurrenceIds: z.string().datetime().array().min(1).optional(),
      }),
    },
    async ({ id, response, recurrenceIds }) =>
      runTool(() =>
        unwrap(
          client.posts.rsvp(
            { response, recurrenceIds },
            { pathParameters: { id } },
          ),
        ),
      ),
  );

  server.registerTool(
    'manage_event_rsvp',
    {
      description:
        'As an event organizer, remove or restore another member’s RSVP for an occurrence.',
      inputSchema: z.object({
        id: z.string().uuid(),
        profileId: z.string().uuid(),
        response: z.enum(['removed', 'yes']),
        recurrenceId: z.string().datetime().optional(),
      }),
    },
    async ({ id, profileId, response, recurrenceId }) =>
      runTool(() =>
        unwrap(
          client.posts.rsvpManage(
            { response, recurrenceId },
            { pathParameters: { id, profileId } },
          ),
        ),
      ),
  );

  // ------------------------------------------------------------------
  // Events
  // ------------------------------------------------------------------

  server.registerTool(
    'list_my_events',
    {
      description: 'List your upcoming, current, or past events.',
      inputSchema: z.object({
        when: z.enum(['upcoming', 'current', 'past']),
        limit: limitSchema,
        offset: offsetSchema,
      }),
    },
    async ({ when, limit, offset }) =>
      runTool(() => {
        const queryParameters = { limit, offset };
        switch (when) {
          case 'upcoming':
            return unwrap(
              client.posts.feeds.events.my.upcoming({ queryParameters }),
            );
          case 'current':
            return unwrap(
              client.posts.feeds.events.my.current({ queryParameters }),
            );
          case 'past':
            return unwrap(
              client.posts.feeds.events.my.past({ queryParameters }),
            );
        }
      }),
  );

  server.registerTool(
    'list_upcoming_events',
    {
      description: 'List community-wide upcoming events.',
      inputSchema: z.object({
        limit: limitSchema,
        offset: offsetSchema,
      }),
    },
    async ({ limit, offset }) =>
      runTool(() =>
        unwrap(
          client.posts.feeds.events.upcoming({
            queryParameters: { limit, offset },
          }),
        ),
      ),
  );

  // ------------------------------------------------------------------
  // Groups
  // ------------------------------------------------------------------

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
      description: 'Open a group by id or handle.',
      inputSchema: idOrHandleSchema,
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
    'create_group',
    {
      description:
        'Create a group. Handle is required; displayName, description, rules, avatar, header, discoverable, and initial member handles are optional.',
      inputSchema: z.object({
        handle: z.string().min(1).max(16),
        displayName: z.string().max(30).optional(),
        description: z.string().optional(),
        rules: z.string().optional(),
        avatar: z.string().url().nullable().optional(),
        header: z.string().url().nullable().optional(),
        discoverable: z.boolean().optional(),
        members: z.array(z.string().min(1).max(64)).optional(),
      }),
    },
    async (input) =>
      runTool(async () => {
        const members = await Promise.all(
          (input.members ?? []).map(async (handle) =>
            unwrap(
              client.profiles.findByHandle({ pathParameters: { handle } }),
            ),
          ),
        );
        return unwrap(
          client.groups.create({
            handle: input.handle,
            displayName: input.displayName,
            description: input.description,
            rules: input.rules,
            avatar: input.avatar,
            header: input.header,
            discoverable: input.discoverable,
            capabilities: {},
            members,
          }),
        );
      }),
  );

  server.registerTool(
    'update_group',
    {
      description:
        'Update group settings (displayName, description, rules, avatar, header, discoverable). Only provide the fields to change.',
      inputSchema: z.object({
        id: z.string().uuid(),
        displayName: z.string().max(30).optional(),
        description: z.string().optional(),
        rules: z.string().optional(),
        avatar: z.string().url().nullable().optional(),
        header: z.string().url().nullable().optional(),
        discoverable: z.boolean().optional(),
      }),
    },
    async ({ id, ...updates }) =>
      runTool(async () => {
        const current = await unwrap(
          client.groups.findById({ pathParameters: { id } }),
        );
        return unwrap(
          client.groups.update(
            {
              handle: current.handle,
              displayName: updates.displayName ?? current.displayName,
              description: updates.description ?? current.description,
              rules: updates.rules ?? current.rules,
              avatar: updates.avatar ?? current.avatar ?? null,
              header: updates.header ?? current.header ?? null,
              discoverable: updates.discoverable ?? current.discoverable,
              capabilities: current.capabilities ?? {},
            },
            { pathParameters: { id } },
          ),
        );
      }),
  );

  server.registerTool(
    'delete_group',
    {
      description: 'Delete a group you own.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.groups.delete({ pathParameters: { id } }))),
  );

  server.registerTool(
    'join_group',
    {
      description: 'Join a group.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.groups.join({ pathParameters: { id } }))),
  );

  server.registerTool(
    'leave_group',
    {
      description: 'Leave a group.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.groups.leave({ pathParameters: { id } }))),
  );

  server.registerTool(
    'add_group_member',
    {
      description: 'Add a member to a group by their profile id or handle.',
      inputSchema: z.object({
        id: z.string().uuid(),
        member: idOrHandleSchema,
      }),
    },
    async ({ id, member }) =>
      runTool(async () => {
        const profile = await unwrap(
          member.id
            ? client.profiles.findById({ pathParameters: { id: member.id } })
            : client.profiles.findByHandle({
                pathParameters: { handle: member.handle! },
              }),
        );
        return unwrap(
          client.groups.addMember(profile, { pathParameters: { id } }),
        );
      }),
  );

  server.registerTool(
    'remove_group_member',
    {
      description: 'Remove a member from a group.',
      inputSchema: z.object({
        id: z.string().uuid(),
        memberId: z.string().uuid(),
      }),
    },
    async ({ id, memberId }) =>
      runTool(() =>
        unwrap(
          client.groups.removeMember({ pathParameters: { id, memberId } }),
        ),
      ),
  );

  server.registerTool(
    'set_group_member_roles',
    {
      description:
        'Set a member’s roles in a group (member, moderator, admin, owner). Passing an empty list removes all roles.',
      inputSchema: z.object({
        id: z.string().uuid(),
        memberId: z.string().uuid(),
        roles: z.array(memberRoleSchema).optional(),
      }),
    },
    async ({ id, memberId, roles }) =>
      runTool(() =>
        unwrap(
          client.groups.setMemberRoles(
            { roles: roles ?? [] },
            { pathParameters: { id, memberId } },
          ),
        ),
      ),
  );

  // ------------------------------------------------------------------
  // Profiles
  // ------------------------------------------------------------------

  server.registerTool(
    'get_profile',
    {
      description: 'Open a profile by id or handle.',
      inputSchema: idOrHandleSchema,
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
    'get_current_profile',
    {
      description: 'Get the authenticated identity’s own profile.',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.profiles.current.read())),
  );

  server.registerTool(
    'list_followers',
    {
      description: 'List who follows a profile.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.profiles.followers({ pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'list_following',
    {
      description: 'List whom a profile follows.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.profiles.following({ pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'list_blocked',
    {
      description: 'List the profiles the authenticated identity has blocked.',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.profiles.current.blocked())),
  );

  server.registerTool(
    'follow_profile',
    {
      description:
        'Follow a profile. Optionally enable reblogs, notifications, and preferred languages (ISO-639-1 codes).',
      inputSchema: z.object({
        id: z.string().uuid(),
        reblogs: z.boolean().optional(),
        notify: z.boolean().optional(),
        languages: z.string().array().optional(),
      }),
    },
    async ({ id, reblogs, notify, languages }) =>
      runTool(() =>
        unwrap(
          client.profiles.follow(
            { reblogs, notify, languages },
            { pathParameters: { id } },
          ),
        ),
      ),
  );

  server.registerTool(
    'unfollow_profile',
    {
      description: 'Unfollow a profile.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.profiles.unfollow({ pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'block_profile',
    {
      description: 'Block a profile.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() => unwrap(client.profiles.block({ pathParameters: { id } }))),
  );

  server.registerTool(
    'unblock_profile',
    {
      description: 'Unblock a profile.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.profiles.unblock({ pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'follow_hashtag',
    {
      description: 'Follow a hashtag so its posts appear in your activity.',
      inputSchema: z.object({
        tag: z.string().min(1),
      }),
    },
    async ({ tag }) =>
      runTool(() =>
        unwrap(
          client.profiles.current.followHashtag({ pathParameters: { tag } }),
        ),
      ),
  );

  server.registerTool(
    'unfollow_hashtag',
    {
      description: 'Unfollow a hashtag.',
      inputSchema: z.object({
        tag: z.string().min(1),
      }),
    },
    async ({ tag }) =>
      runTool(() =>
        unwrap(
          client.profiles.current.unfollowHashtag({
            pathParameters: { tag },
          }),
        ),
      ),
  );

  server.registerTool(
    'update_profile',
    {
      description:
        'Update your own profile (handle, displayName, bio, avatar, header, timeZone, location, locked, bot, discoverable, fields). Only provide the fields to change.',
      inputSchema: z.object({
        handle: z.string().min(1).max(16).optional(),
        displayName: z.string().max(30).optional(),
        bio: z.string().optional(),
        avatar: z.string().url().nullable().optional(),
        header: z.string().url().nullable().optional(),
        timeZone: z.string().optional(),
        location: z
          .object({
            text: z.string(),
            coordinates: z
              .object({
                lat: z.number(),
                lng: z.number(),
                alt: z.number().optional(),
              })
              .optional(),
          })
          .optional(),
        locked: z.boolean().optional(),
        bot: z.boolean().optional(),
        discoverable: z.boolean().optional(),
        fields: z
          .array(
            z.object({
              name: z.string().min(1).max(255),
              value: z.string().max(255),
            }),
          )
          .optional(),
      }),
    },
    async (updates) =>
      runTool(async () => {
        const current = await unwrap(client.profiles.current.read());
        const merged = {
          handle: updates.handle ?? current.handle,
          type: current.type,
          displayName: updates.displayName ?? current.displayName,
          bio: updates.bio ?? current.bio,
          avatar: updates.avatar ?? current.avatar ?? null,
          header: updates.header ?? current.header ?? null,
          timeZone: updates.timeZone ?? current.timeZone,
          location: updates.location ?? current.location,
          locked: updates.locked ?? current.locked,
          bot: updates.bot ?? current.bot,
          discoverable: updates.discoverable ?? current.discoverable,
          fields: updates.fields ?? current.fields,
        };
        return unwrap(client.profiles.current.update(merged));
      }),
  );

  server.registerTool(
    'update_profile_settings',
    {
      description:
        'Update your profile settings (language, timeZone, theme, feed settings, per-group notification levels, notification preferences). Only provide the fields to change; existing values are preserved.',
      inputSchema: z.object({
        language: z.string().optional(),
        timeZone: z.string().optional(),
        theme: z.enum(['community', 'light', 'dark', 'system']).optional(),
        defaults: z
          .object({
            privacy: z.enum(['public', 'unlisted', 'private']).optional(),
            sensitive: z.boolean().optional(),
            language: z.string().optional(),
          })
          .optional(),
        notifications: z
          .record(z.string(), notificationSettingsSchema)
          .optional(),
        groupNotificationLevels: z
          .record(z.string(), z.enum(['all', 'mostRelevant', 'off']))
          .optional(),
        feedSettings: z
          .object({
            format: z.enum(['threaded', 'linear']).optional(),
            communityFeed: z
              .object({
                showGroupPosts: z.boolean().optional(),
              })
              .optional(),
          })
          .optional(),
      }),
    },
    async (updates) =>
      runTool(async () => {
        const current = await unwrap(client.profiles.current.readSettings());
        const merged = {
          id: current.id,
          language: updates.language ?? current.language,
          timeZone: updates.timeZone ?? current.timeZone,
          theme: updates.theme ?? current.theme,
          defaults: updates.defaults ?? current.defaults,
          notifications: updates.notifications ?? current.notifications,
          groupNotificationLevels:
            updates.groupNotificationLevels ?? current.groupNotificationLevels,
          jamSettings: current.jamSettings,
          stripeSettings: current.stripeSettings,
          feedSettings: {
            format:
              updates.feedSettings?.format ?? current.feedSettings?.format,
            communityFeed: {
              showGroupPosts:
                updates.feedSettings?.communityFeed?.showGroupPosts ??
                current.feedSettings?.communityFeed?.showGroupPosts ??
                true,
            },
          },
        };
        return unwrap(client.profiles.current.updateSettings(merged));
      }),
  );

  server.registerTool(
    'pin_post',
    {
      description: 'Pin a post to the top of your profile. Pass null to unpin.',
      inputSchema: z.object({
        postId: z.string().uuid().nullable(),
      }),
    },
    async ({ postId }) =>
      runTool(() =>
        unwrap(client.profiles.current.pinPost({ postId: postId ?? '' })),
      ),
  );

  // ------------------------------------------------------------------
  // Conversations (direct messages)
  // ------------------------------------------------------------------

  server.registerTool(
    'list_conversations',
    {
      description:
        'List your direct message conversations. Each item is the root post of the conversation (a note post created as direct).',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.conversations.list())),
  );

  server.registerTool(
    'list_archived_conversations',
    {
      description: 'List your archived direct message conversations.',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.conversations.archived())),
  );

  server.registerTool(
    'search_conversations',
    {
      description:
        'Search your direct messages by text, optionally scoped to a single conversation.',
      inputSchema: z.object({
        q: z.string().min(1),
        conversationId: z.string().uuid().optional(),
      }),
    },
    async ({ q, conversationId }) =>
      runTool(() =>
        unwrap(
          client.conversations.search({
            queryParameters: { q, conversationId },
          }),
        ),
      ),
  );

  server.registerTool(
    'get_conversation',
    {
      description: 'Open a direct message conversation by its root post id.',
      inputSchema: z.object({
        id: z.string().uuid(),
        message: z.string().optional(),
      }),
    },
    async ({ id, message }) =>
      runTool(() =>
        unwrap(
          client.conversations.findById({
            pathParameters: { id },
            queryParameters: { message },
          }),
        ),
      ),
  );

  server.registerTool(
    'send_dm',
    {
      description:
        'Send a direct message into an existing conversation by its root post id. Content is a note body.',
      inputSchema: z.object({
        conversationId: z.string().uuid(),
        content: z.string().min(1),
        spoilerText: z.string().optional(),
        sensitive: z.boolean().optional(),
        language: z.string().optional(),
      }),
    },
    async ({ conversationId, content, spoilerText, sensitive, language }) =>
      runTool(() =>
        unwrap(
          client.conversations.newPost(
            {
              visibility: 'direct',
              type: 'note',
              data: {
                type: 'note',
                content,
                spoilerText,
                sensitive,
                language,
              },
            },
            { pathParameters: { id: conversationId } },
          ),
        ),
      ),
  );

  server.registerTool(
    'leave_conversation',
    {
      description:
        'Leave a direct message conversation. You will no longer see it or receive its messages.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.conversations.leave({ pathParameters: { id } })),
      ),
  );

  // ------------------------------------------------------------------
  // Reports
  // ------------------------------------------------------------------

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

  server.registerTool(
    'create_report',
    {
      description:
        'Report content to the community. Provide a category (spam, violation, other), a short comment, the profile being reported, and the post ids involved. Optional ruleIds reference the community rules.',
      inputSchema: z.object({
        category: z.enum(['spam', 'violation', 'other']),
        comment: z.string().min(1).max(1000),
        uri: z.string().url().optional(),
        forward: z.boolean().optional(),
        ruleIds: z.number().int().array().optional(),
        profileId: z.string().uuid(),
        postIds: z.string().uuid().array().min(1),
      }),
    },
    async ({ category, comment, uri, forward, ruleIds, profileId, postIds }) =>
      runTool(() =>
        unwrap(
          client.reports.create({
            report: {
              comment,
              uri,
              forward,
              category,
              ruleIds,
            },
            profileId,
            postIds,
          }),
        ),
      ),
  );

  // ------------------------------------------------------------------
  // Notifications
  // ------------------------------------------------------------------

  server.registerTool(
    'list_notifications',
    {
      description: 'List your recent notifications.',
      inputSchema: z.object({
        limit: limitSchema,
        start: z.string().optional(),
      }),
    },
    async ({ limit, start }) =>
      runTool(() =>
        unwrap(
          client.profiles.current.notifications({
            queryParameters: { limit, start },
          }),
        ),
      ),
  );

  server.registerTool(
    'get_notification_stats',
    {
      description: 'Get counts of unseen and total notifications.',
      inputSchema: z.object({}),
    },
    async () =>
      runTool(() => unwrap(client.profiles.current.notificationStats())),
  );

  server.registerTool(
    'mark_all_notifications_as_seen',
    {
      description: 'Mark all notifications as seen.',
      inputSchema: z.object({}),
    },
    async () =>
      runTool(() =>
        unwrap(client.profiles.current.markAllNotificationsAsSeen()),
      ),
  );

  // ------------------------------------------------------------------
  // Jams
  // ------------------------------------------------------------------

  server.registerTool(
    'list_jams',
    {
      description: 'List live jams, or all jams.',
      inputSchema: z.object({
        live: z.boolean().optional(),
      }),
    },
    async ({ live }) =>
      runTool(() =>
        unwrap(
          client.jams.list({
            queryParameters: live ? { live: 'true' } : undefined,
          }),
        ),
      ),
  );

  server.registerTool(
    'get_jam_state',
    {
      description:
        'Get the current state of a jam (active, participant ids). For recurring jams, pass the occurrence id.',
      inputSchema: z.object({
        id: z.string().uuid(),
        occurrence: z.string().optional(),
      }),
    },
    async ({ id, occurrence }) =>
      runTool(() =>
        unwrap(
          client.jams.state({
            pathParameters: { id },
            queryParameters: { occurrence },
          }),
        ),
      ),
  );

  server.registerTool(
    'close_jam',
    {
      description: 'Close a jam you have moderator permissions for.',
      inputSchema: z.object({
        id: z.string().uuid(),
        occurrence: z.string().optional(),
      }),
    },
    async ({ id, occurrence }) =>
      runTool(() =>
        unwrap(
          client.jams.close({
            pathParameters: { id },
            queryParameters: { occurrence },
          }),
        ),
      ),
  );

  server.registerTool(
    'list_jam_events',
    {
      description: 'List join/leave/reaction events for a jam.',
      inputSchema: z.object({
        id: z.string().uuid(),
        limit: limitSchema,
        start: z.string().optional(),
      }),
    },
    async ({ id, limit, start }) =>
      runTool(() =>
        unwrap(
          client.jams.events.list({
            pathParameters: { id },
            queryParameters: { limit, start },
          }),
        ),
      ),
  );

  server.registerTool(
    'list_jam_attendance',
    {
      description: 'List attendance (join/leave) events for a jam.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.jams.events.attendance({ pathParameters: { id } })),
      ),
  );

  // ------------------------------------------------------------------
  // Media
  // ------------------------------------------------------------------

  server.registerTool(
    'list_media_attachments',
    {
      description: 'List media attachments you have uploaded.',
      inputSchema: z.object({}),
    },
    async () => runTool(() => unwrap(client.mediaAttachment.list())),
  );

  server.registerTool(
    'get_media_attachment',
    {
      description: 'Get a media attachment by id.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.mediaAttachment.findById({ pathParameters: { id } })),
      ),
  );

  server.registerTool(
    'delete_media_attachment',
    {
      description: 'Delete a media attachment you uploaded.',
      inputSchema: z.object({
        id: z.string().uuid(),
      }),
    },
    async ({ id }) =>
      runTool(() =>
        unwrap(client.mediaAttachment.delete({ pathParameters: { id } })),
      ),
  );
};
