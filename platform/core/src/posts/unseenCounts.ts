import { sql } from 'drizzle-orm';
import type { UnseenPostCounts } from '@openpeepshq/common/types';
import type { PgDb } from '../db/pg/client';

type ExecuteResult = { rows: Record<string, unknown>[] };

/** Shared predicates for group unseen count and mark-all-read.
 * Includes replies to group posts, not just top-level posts — replies carry
 * the same groupId and should contribute to the group unread badge.
 */
const unseenGroupPostMatch = (profileId: string) => sql`
  p.visibility <> 'direct'
  AND p.creator_id <> ${profileId}
  AND NOT EXISTS (
    SELECT 1
    FROM post_seen ps
    WHERE ps.from_id = ${profileId}
      AND ps.to_id = p.id::text
  )
`;

/** Group unseen counts via anti-join (no post hydration). */
export const countUnseenGroupPosts = async (
  db: PgDb,
  profileId: string,
  groupIds: string[],
): Promise<Record<string, number>> => {
  const counts: Record<string, number> = Object.fromEntries(
    groupIds.map((groupId) => [groupId, 0]),
  );
  if (groupIds.length === 0) return counts;

  const result = (await db.execute(sql`
    SELECT pg.to_id AS group_id, count(*)::int AS cnt
    FROM post_groups pg
    INNER JOIN posts p
      ON p.id::text = pg.from_id
      AND p.deleted_at IS NULL
    WHERE pg.to_id IN (${sql.join(
      groupIds.map((id) => sql`${id}`),
      sql`, `,
    )})
      AND ${unseenGroupPostMatch(profileId)}
    GROUP BY pg.to_id
  `)) as unknown as ExecuteResult;

  for (const row of result.rows) {
    const groupId = row.group_id as string;
    if (groupId in counts) {
      counts[groupId] = Number(row.cnt) || 0;
    }
  }
  return counts;
};

/** Same posts as {@link countUnseenGroupPosts} for one group (mark-all-read). */
export const listUnseenGroupPostIds = async (
  db: PgDb,
  profileId: string,
  groupId: string,
): Promise<string[]> => {
  const result = (await db.execute(sql`
    SELECT p.id::text AS post_id
    FROM post_groups pg
    INNER JOIN posts p
      ON p.id::text = pg.from_id
      AND p.deleted_at IS NULL
    WHERE pg.to_id = ${groupId}
      AND ${unseenGroupPostMatch(profileId)}
  `)) as unknown as ExecuteResult;

  return result.rows.map((row) => row.post_id as string).filter((id) => !!id);
};

/**
 * Direct-message unread counts keyed by conversation root.
 * Walks reply_to to roots without hydrating posts.
 */
export const countUnseenDirectPosts = async (
  db: PgDb,
  profileId: string,
): Promise<Record<string, number>> => {
  const result = (await db.execute(sql`
    WITH RECURSIVE my_direct AS (
      SELECT p.id::text AS post_id, p.creator_id
      FROM audience a
      INNER JOIN posts p
        ON p.id::text = a.from_id
        AND p.deleted_at IS NULL
      WHERE a.to_id = ${profileId}
        AND p.visibility = 'direct'
        -- Leave markers keep the author out of the audience. They are not messages.
        AND EXISTS (
          SELECT 1
          FROM audience author_edge
          WHERE author_edge.from_id = p.id::text
            AND author_edge.to_id = p.creator_id
        )
    ),
    walk AS (
      SELECT d.post_id, d.post_id AS node_id, 0 AS depth
      FROM my_direct d
      UNION ALL
      SELECT walk.post_id, rt.to_id, walk.depth + 1
      FROM reply_to rt
      INNER JOIN walk ON rt.from_id = walk.node_id
    ),
    roots AS (
      SELECT DISTINCT ON (post_id) post_id, node_id AS root_id
      FROM walk
      ORDER BY post_id, depth DESC
    )
    SELECT roots.root_id, count(*)::int AS cnt
    FROM my_direct d
    INNER JOIN roots ON roots.post_id = d.post_id
    WHERE d.creator_id <> ${profileId}
      AND NOT EXISTS (
        SELECT 1
        FROM post_seen ps
        WHERE ps.from_id = ${profileId}
          AND ps.to_id = d.post_id
      )
    GROUP BY roots.root_id
    HAVING count(*) > 0
  `)) as unknown as ExecuteResult;

  return Object.fromEntries(
    result.rows.map((row) => [row.root_id as string, Number(row.cnt) || 0]),
  );
};

/**
 * Merge 1:1 direct counts into the pair's oldest root key so a conversation
 * with several roots keeps one badge. The key must match the inbox preview's
 * canonical id (min uuidv7 root); non-1:1 roots keep their own key.
 */
export const mergeOneToOneDirectCounts = async (
  db: PgDb,
  counts: Record<string, number>,
): Promise<Record<string, number>> => {
  const countedRootIds = Object.keys(counts);
  if (countedRootIds.length === 0) return counts;

  const result = (await db.execute(sql`
    WITH counted AS (
      SELECT p.id::text AS root_id,
             string_agg(a.to_id, ',' ORDER BY a.to_id) AS pair
      FROM posts p
      INNER JOIN audience a ON a.from_id = p.id::text
      WHERE p.id::text IN (${sql.join(
        countedRootIds.map((id) => sql`${id}`),
        sql`, `,
      )})
      GROUP BY p.id
      HAVING count(*) = 2
    ),
    pair_roots AS (
      SELECT p2.id::text AS root_id,
             string_agg(a2.to_id, ',' ORDER BY a2.to_id) AS pair
      FROM posts p2
      INNER JOIN audience a2 ON a2.from_id = p2.id::text
      WHERE p2.visibility = 'direct'
        AND p2.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM reply_to rt
          WHERE rt.from_id = p2.id::text
        )
      GROUP BY p2.id
      HAVING count(*) = 2
    ),
    canonical AS (
      SELECT pair, min(root_id)::text AS canonical_root_id
      FROM pair_roots
      GROUP BY pair
    )
    SELECT c.root_id, canonical.canonical_root_id
    FROM counted c
    INNER JOIN canonical ON canonical.pair = c.pair
  `)) as unknown as ExecuteResult;

  const canonicalByRoot = new Map(
    result.rows.map(
      (row) =>
        [row.root_id as string, row.canonical_root_id as string] as const,
    ),
  );

  const merged: Record<string, number> = {};
  for (const [rootId, count] of Object.entries(counts)) {
    const key = canonicalByRoot.get(rootId) ?? rootId;
    merged[key] = (merged[key] ?? 0) + count;
  }
  return merged;
};

export const queryUnseenPostCounts = async (
  db: PgDb,
  profileId: string,
  groupIds: string[],
): Promise<UnseenPostCounts> => {
  const [groups, direct] = await Promise.all([
    countUnseenGroupPosts(db, profileId, groupIds),
    countUnseenDirectPosts(db, profileId),
  ]);
  return { groups, direct: await mergeOneToOneDirectCounts(db, direct) };
};
