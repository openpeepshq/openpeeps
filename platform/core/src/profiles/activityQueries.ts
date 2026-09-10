import { sql } from 'drizzle-orm';
import { postActivityScoreExpr } from '../db/pg/queries';
import { posts } from '../db/pg/schema/documents';
import {
  bookmarks,
  entries,
  reactions,
  replyTo,
  repost,
  userGroups,
} from '../db/pg/schema/edges';

export const TOP_POSTS_LIMIT = 5;
export const TOP_POST_CANDIDATE_LIMIT = 25;

const isReplySql = sql`EXISTS (
  SELECT 1 FROM ${replyTo} WHERE ${replyTo.fromId} = ${posts.id}::text
)`;

export const profileActivityCountsSql = (profileId: string) => sql`
  SELECT
    COUNT(*) FILTER (WHERE NOT ${isReplySql})::int AS posts_count,
    COUNT(*) FILTER (WHERE ${isReplySql})::int AS replies_count,
    COUNT(*) FILTER (
      WHERE ${posts.type} = 'event' AND NOT ${isReplySql}
    )::int AS events_count,
    (
      SELECT COUNT(*)::int FROM ${reactions}
      WHERE ${reactions.fromId} = ${profileId}
    ) AS reactions_given,
    (
      SELECT COUNT(*)::int
      FROM ${reactions}
      INNER JOIN ${posts} received_posts
        ON received_posts.id::text = ${reactions.toId}
      WHERE received_posts.creator_id = ${profileId}
        AND received_posts.deleted_at IS NULL
        AND received_posts.visibility <> 'direct'
    ) AS reactions_received,
    (
      SELECT COUNT(*)::int FROM ${repost}
      WHERE ${repost.fromId} = ${profileId}
    ) AS reposts_count,
    (
      SELECT COUNT(*)::int
      FROM ${repost}
      INNER JOIN ${posts} reposted_posts
        ON reposted_posts.id::text = ${repost.toId}
      WHERE reposted_posts.creator_id = ${profileId}
        AND reposted_posts.deleted_at IS NULL
        AND reposted_posts.visibility <> 'direct'
    ) AS reposts_received,
    (
      SELECT COUNT(*)::int
      FROM ${replyTo}
      INNER JOIN ${posts} reply_child_posts
        ON reply_child_posts.id::text = ${replyTo.fromId}
      INNER JOIN ${posts} parent_posts
        ON parent_posts.id::text = ${replyTo.toId}
      WHERE parent_posts.creator_id = ${profileId}
        AND parent_posts.deleted_at IS NULL
        AND parent_posts.visibility <> 'direct'
        AND reply_child_posts.deleted_at IS NULL
    ) AS replies_received,
    (
      SELECT COUNT(*)::int FROM ${entries}
      WHERE ${entries.fromId} = ${profileId}
        AND ${entries.body}->>'type' = 'rsvp'
    ) AS rsvps_count,
    (
      SELECT COUNT(*)::int FROM ${bookmarks}
      WHERE ${bookmarks.fromId} = ${profileId}
    ) AS bookmarks_count,
    (
      SELECT COUNT(*)::int FROM ${userGroups}
      WHERE ${userGroups.fromId} = ${profileId}
    ) AS groups_count
  FROM ${posts}
  WHERE ${posts.creatorId} = ${profileId}
    AND ${posts.deletedAt} IS NULL
    AND ${posts.visibility} <> 'direct'
`;

export const profileTopPostScoresSql = (profileId: string) => sql`
  SELECT ${posts.id}::text AS id, (${postActivityScoreExpr(posts)})::int AS activity_score
  FROM ${posts}
  WHERE ${posts.creatorId} = ${profileId}
    AND ${posts.deletedAt} IS NULL
    AND ${posts.visibility} <> 'direct'
    AND NOT ${isReplySql}
  ORDER BY activity_score DESC, ${posts.id} DESC
  LIMIT ${TOP_POST_CANDIDATE_LIMIT}
`;

export const takeTopReadablePosts = <T>(
  ordered: T[],
  isReadable: (item: T) => boolean,
): T[] => ordered.filter(isReadable).slice(0, TOP_POSTS_LIMIT);
