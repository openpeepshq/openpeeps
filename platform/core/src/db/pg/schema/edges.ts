import { index, jsonb, pgTable, text, uniqueIndex } from 'drizzle-orm/pg-core';
import { edgeTimestamps, idColumn } from './base';

const edgeTable = (name: string, uniqueFromTo = false) =>
  pgTable(
    name,
    {
      id: idColumn(),
      fromId: text('from_id').notNull(),
      toId: text('to_id').notNull(),
      body: jsonb('body').default({}),
      ...edgeTimestamps,
    },
    (t) => [
      index(`${name}_from_idx`).on(t.fromId),
      index(`${name}_to_idx`).on(t.toId),
      ...(uniqueFromTo
        ? [uniqueIndex(`${name}_from_to_unique`).on(t.fromId, t.toId)]
        : []),
    ],
  );

export const follows = edgeTable('follows', true);
export const requestsFollow = edgeTable('requests_follow');
export const controls = edgeTable('controls');
export const mentions = edgeTable('mentions');
export const audience = edgeTable('audience');
export const postHashtags = edgeTable('post_hashtags');
export const entries = edgeTable('entries');
export const reactions = edgeTable('reactions', true);
export const replyTo = edgeTable('reply_to', true);
export const repost = edgeTable('repost', true);
export const bookmarks = edgeTable('bookmarks');
export const postSeen = edgeTable('post_seen', true);
export const hasSeen = edgeTable('has_seen');
export const hasRead = edgeTable('has_read');
export const userGroups = edgeTable('user_groups');
export const postGroups = edgeTable('post_groups');
export const hasRole = edgeTable('has_role');
export const profileAccessTokens = edgeTable('profile_access_tokens', true);
export const accountToPushSubscription = edgeTable(
  'account_to_push_subscription',
);
export const createdReport = edgeTable('created_report');
export const isReportedProfile = edgeTable('is_reported_profile');
export const isReportedObject = edgeTable('is_reported_object');
export const inviteLinkCreators = edgeTable('invite_link_creators');
export const inviteLinkRedeemers = edgeTable('invite_link_redeemers');
export const jamRecordings = edgeTable('jam_recordings');
