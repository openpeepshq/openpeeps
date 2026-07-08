import { and, gte, lt, sql, type SQL } from 'drizzle-orm';
import { posts, profiles, groups } from '../schema/documents';
import {
  entries,
  follows,
  postGroups,
  reactions,
  repost,
  replyTo,
} from '../schema/edges';
import type { ActivityWindow } from '../map/queryTypes';

const edgeOutboundCount = (
  edgeTable: typeof entries,
  window?: ActivityWindow,
): SQL => {
  const conditions: SQL[] = [sql`${edgeTable.fromId} = ${profiles.id}`];
  if (window?.start) {
    conditions.push(gte(edgeTable.createdAt, window.start.toISOString()));
  }
  if (window?.end) {
    conditions.push(lt(edgeTable.createdAt, window.end.toISOString()));
  }
  return sql`(SELECT count(*)::int FROM ${edgeTable} WHERE ${and(...conditions)})`;
};

export const profileActivityScoreExpr = (window?: ActivityWindow): SQL =>
  sql`COALESCE(${edgeOutboundCount(entries, window)}, 0) + COALESCE(${edgeOutboundCount(reactions, window)}, 0) + COALESCE(${edgeOutboundCount(follows, window)}, 0)`;

export const postActivityScoreExpr = (): SQL =>
  sql`(SELECT count(*)::int FROM ${reactions} WHERE ${reactions.toId} = ${posts.id}) + (SELECT count(*)::int FROM ${entries} WHERE ${entries.toId} = ${posts.id}) + (SELECT count(*)::int FROM ${replyTo} rt INNER JOIN ${posts} p ON p.id = rt.from_id WHERE rt.to_id = ${posts.id} AND p.deleted_at IS NULL) + (SELECT count(*)::int FROM ${repost} WHERE ${repost.toId} = ${posts.id})`;

export const postReplyCountExpr = (): SQL =>
  sql`(SELECT count(*)::int FROM ${replyTo} rt INNER JOIN ${posts} p ON p.id = rt.from_id WHERE rt.to_id = ${posts.id} AND p.deleted_at IS NULL)`;

export const groupLastPostAtExpr = (): SQL =>
  sql`(SELECT max(${postGroups.createdAt}) FROM ${postGroups} WHERE ${postGroups.toId} = ${groups.id})`;
