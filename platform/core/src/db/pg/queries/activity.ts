import {
  and,
  gte,
  lt,
  sql,
  getTableName,
  type SQL,
  type Table,
} from 'drizzle-orm';
import { posts } from '../schema/documents';
import {
  entries,
  follows,
  postGroups,
  reactions,
  repost,
  replyTo,
} from '../schema/edges';
import type { ActivityWindow } from '../map/queryTypes';
import type { PgTable } from '../map/registry';

const outerIdText = (table: PgTable): SQL => {
  const tableName = getTableName(table as Table);
  return sql.raw(`"${tableName}"."id"::text`);
};

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
  sql`COALESCE(${edgeOutboundCount(entries, outerTable, window)}, 0) + COALESCE(${edgeOutboundCount(reactions, outerTable, window)}, 0) + COALESCE(${edgeOutboundCount(follows, outerTable, window)}, 0)`;

export const postActivityScoreExpr = (outerTable: PgTable): SQL => {
  const postId = outerIdText(outerTable);
  return sql`(SELECT count(*)::int FROM ${reactions} WHERE ${reactions.toId} = ${postId}) + (SELECT count(*)::int FROM ${entries} WHERE ${entries.toId} = ${postId}) + (SELECT count(*)::int FROM ${replyTo} rt INNER JOIN ${posts} p ON p.id::text = rt.from_id WHERE rt.to_id = ${postId} AND p.deleted_at IS NULL) + (SELECT count(*)::int FROM ${repost} WHERE ${repost.toId} = ${postId})`;
};

export const postReplyCountExpr = (outerTable: PgTable): SQL => {
  const postId = outerIdText(outerTable);
  return sql`(SELECT count(*)::int FROM ${replyTo} rt INNER JOIN ${posts} p ON p.id::text = rt.from_id WHERE rt.to_id = ${postId} AND p.deleted_at IS NULL)`;
};

export const groupLastPostAtExpr = (outerTable: PgTable): SQL =>
  sql`(SELECT max(${postGroups.createdAt}) FROM ${postGroups} WHERE ${postGroups.toId} = ${outerIdText(outerTable)})`;

export const groupPostsCountExpr = (outerTable: PgTable): SQL =>
  sql`(SELECT count(*)::int FROM ${postGroups} pg INNER JOIN ${posts} p ON p.id::text = pg.from_id WHERE pg.to_id = ${outerIdText(outerTable)} AND p.deleted_at IS NULL)`;
