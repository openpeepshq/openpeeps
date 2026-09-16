import { sql } from 'drizzle-orm';
import type { PgDb } from '../db/pg/client';

type ExecuteResult = { rows: Record<string, unknown>[] };

/**
 * Walk outbound `reply_to` until there is no parent. A root post is itself.
 */
export const findReplyRootId = async (
  db: PgDb,
  postId: string,
): Promise<string> => {
  const result = (await db.execute(sql`
    WITH RECURSIVE walk AS (
      SELECT ${postId}::text AS node_id, 0 AS depth
      UNION ALL
      SELECT rt.to_id, walk.depth + 1
      FROM reply_to rt
      INNER JOIN walk ON rt.from_id = walk.node_id
      WHERE walk.depth < 64
    )
    SELECT node_id
    FROM walk
    ORDER BY depth DESC
    LIMIT 1
  `)) as unknown as ExecuteResult;

  return (result.rows[0]?.node_id as string | undefined) ?? postId;
};

/** Bump conversation ordering without changing `created_at` or `updated_at`. */
export const touchPostActivity = async (
  db: PgDb,
  postId: string,
): Promise<void> => {
  await db.execute(sql`
    UPDATE posts
    SET last_activity_at = now()
    WHERE id = ${postId}::uuid
  `);
};

/** Replies and reactions on any descendant bump the original/root post. */
export const bumpConversationActivity = async (
  db: PgDb,
  postId: string,
): Promise<void> => {
  const rootId = await findReplyRootId(db, postId);
  await touchPostActivity(db, rootId);
};
