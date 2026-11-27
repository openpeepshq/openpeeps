import {
  and,
  count,
  eq,
  exists,
  gte,
  isNull,
  lt,
  max,
  sql,
  type SQL,
  type SQLWrapper,
} from 'drizzle-orm';
import { alias, QueryBuilder } from 'drizzle-orm/pg-core';
import { posts } from '../schema/documents';
import { entries, follows, postGroups, repost, replyTo } from '../schema/edges';
import type { ActivityWindow } from '../map/queryTypes';
import { asTable, type PgTable } from '../map/registry';

const queryBuilder = new QueryBuilder();

const outerIdText = (table: PgTable): SQL =>
  sql`${asTable(table).id as SQLWrapper}::text`;

const edgeOutboundCount = (
  edgeTable: typeof entries,
  outerTable: PgTable,
  window?: ActivityWindow,
): SQL => {
  const conditions: SQL[] = [
    sql`${edgeTable.fromId} = ${outerIdText(outerTable)}`,
  ];
  if (window?.start) {
    conditions.push(gte(edgeTable.createdAt, window.start.toISOString()));
  }
  if (window?.end) {
    conditions.push(lt(edgeTable.createdAt, window.end.toISOString()));
  }
  return sql`(SELECT count(*)::int FROM ${edgeTable} WHERE ${and(...conditions)})`;
};

export const profileActivityScoreExpr = (
  outerTable: PgTable,
  window?: ActivityWindow,
): SQL =>
  sql`COALESCE(${edgeOutboundCount(entries, outerTable, window)}, 0) + COALESCE(${edgeOutboundCount(follows, outerTable, window)}, 0)`;

export const postActivityScoreExpr = (outerTable: PgTable): SQL => {
  const postId = outerIdText(outerTable);
  return sql`(SELECT count(*)::int FROM ${entries} WHERE ${entries.toId} = ${postId}) + (SELECT count(*)::int FROM ${replyTo} rt INNER JOIN ${posts} p ON p.id::text = rt.from_id WHERE rt.to_id = ${postId} AND p.deleted_at IS NULL) + (SELECT count(*)::int FROM ${repost} WHERE ${repost.toId} = ${postId})`;
};

export const postReplyCountExpr = (outerTable: PgTable): SQL<number> => {
  const replyPosts = alias(posts, 'reply_posts');
  const postId = outerIdText(outerTable);
  const query = queryBuilder
    .select({ count: count() })
    .from(replyTo)
    .innerJoin(replyPosts, eq(sql`${replyPosts.id}::text`, replyTo.fromId))
    .where(and(eq(replyTo.toId, postId), isNull(replyPosts.deletedAt)));
  return sql<number>`(${query})`.mapWith(Number);
};

export const postReplyToCountExpr = (outerTable: PgTable): SQL<number> => {
  const query = queryBuilder
    .select({ count: count() })
    .from(replyTo)
    .where(eq(replyTo.fromId, outerIdText(outerTable)));
  return sql<number>`(${query})`.mapWith(Number);
};

export const postHasYesOrMaybeRsvpExpr = (
  outerTable: PgTable,
  profileId: string,
): SQL =>
  exists(
    queryBuilder
      .select({ id: entries.id })
      .from(entries)
      .where(
        and(
          eq(entries.toId, outerIdText(outerTable)),
          eq(entries.fromId, profileId),
          sql`${entries.body}->>'type' = 'rsvp'`,
          sql`${entries.body}->'data'->>'response' IN ('yes', 'tentative')`,
        ),
      ),
  );

// Draft rows (published_at IS NULL) and deleted posts must not count as
// group activity: they are invisible to everyone but the author. The
// subqueries are built with the query builder (as in postReplyCountExpr) so
// every column renders fully qualified: a raw sql`max(${postGroups.createdAt})`
// template drops the table qualification inside a select-object embedding,
// which is ambiguous once the subquery joins posts (42702).
export const groupLastPostAtExpr = (outerTable: PgTable): SQL => {
  const query = queryBuilder
    .select({ at: max(postGroups.createdAt) })
    .from(postGroups)
    .innerJoin(posts, eq(sql`${posts.id}::text`, postGroups.fromId))
    .where(
      and(
        eq(postGroups.toId, outerIdText(outerTable)),
        sql`${posts.publishedAt} IS NOT NULL`,
        isNull(posts.deletedAt),
      ),
    );
  return sql`(${query})`;
};

export const groupPostsCountExpr = (outerTable: PgTable): SQL => {
  const query = queryBuilder
    .select({ total: count() })
    .from(postGroups)
    .innerJoin(posts, eq(sql`${posts.id}::text`, postGroups.fromId))
    .where(
      and(
        eq(postGroups.toId, outerIdText(outerTable)),
        sql`${posts.publishedAt} IS NOT NULL`,
        isNull(posts.deletedAt),
      ),
    );
  return sql`(${query})`.mapWith(Number);
};
