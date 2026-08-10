import { sql } from 'drizzle-orm';
import type {
  AuthorizationData,
  DbPost,
  PostWithMeta,
} from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import type { PgDb } from '../db/pg/client';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { applySort } from '../db/pg/map/filters';
import type { Mapping } from '../db/pg/map';
import { capabilitiesConfig } from '../config';
import { canReadPost, transformPost } from './helpers';

export const CONTEXT_NODE_CAP = 100;

type ClosureDirection = 'ancestors' | 'descendents';

type ExecuteResult = { rows: Record<string, unknown>[] };

/** Collect reply-graph ids via one recursive CTE (capped). */
export const collectReplyClosureIds = async (
  db: PgDb,
  startId: string,
  direction: ClosureDirection,
  {
    maxDepth = 9999,
    limit = CONTEXT_NODE_CAP,
  }: { maxDepth?: number; limit?: number } = {},
): Promise<string[]> => {
  if (!startId || limit <= 0) return [];

  const query =
    direction === 'ancestors'
      ? sql`
          WITH RECURSIVE t AS (
            SELECT to_id AS id, 1 AS depth
            FROM reply_to
            WHERE from_id = ${startId}
            UNION ALL
            SELECT r.to_id, t.depth + 1
            FROM reply_to r
            INNER JOIN t ON r.from_id = t.id
            WHERE t.depth < ${maxDepth}
          )
          SELECT id FROM t
          LIMIT ${limit}
        `
      : sql`
          WITH RECURSIVE t AS (
            SELECT from_id AS id, 1 AS depth
            FROM reply_to
            WHERE to_id = ${startId}
            UNION ALL
            SELECT r.from_id, t.depth + 1
            FROM reply_to r
            INNER JOIN t ON r.to_id = t.id
            WHERE t.depth < ${maxDepth}
          )
          SELECT id FROM t
          LIMIT ${limit}
        `;

  const result = (await db.execute(query)) as unknown as ExecuteResult;
  return result.rows.map((row) => row.id as string);
};

/** Load and hydrate posts in a reply closure, then ACL-filter + transform. */
export const loadReplyContextPosts = async (
  authData: AuthorizationData,
  startId: string,
  direction: ClosureDirection,
  mapping: Mapping<DbPost>,
  {
    maxDepth = 9999,
    limit = CONTEXT_NODE_CAP,
  }: { maxDepth?: number; limit?: number } = {},
): Promise<PostWithMeta[]> => {
  const { db } = await allpeepDb();
  const mapData = mapping.data();
  const ids = await collectReplyClosureIds(db, startId, direction, {
    maxDepth,
    limit,
  });
  if (!ids.length) return [];

  const rows = await fetchRowsByIds(
    db,
    mapData.collection,
    ids,
    mapData.softDelete,
  );
  const hydrated = (await hydrateMapData(
    db,
    mapData,
    rows,
  )) as unknown as DbPost[];
  const sorted = applySort(hydrated, mapData.sort) as DbPost[];

  const config = await capabilitiesConfig();
  const readable = canReadPost(config, authData);
  const posts: PostWithMeta[] = [];
  for (const post of sorted) {
    const transformed = await transformPost(post, authData.profile);
    if (readable(transformed)) posts.push(transformed);
  }
  return posts;
};
