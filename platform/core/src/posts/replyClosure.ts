import { sql } from 'drizzle-orm';
import type { PgDb } from '../db/pg/client';

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
    /** Newest-first by uuidv7 id (useful for long DM threads). */
    newestFirst = false,
  }: { maxDepth?: number; limit?: number; newestFirst?: boolean } = {},
): Promise<string[]> => {
  if (!startId || limit <= 0) return [];

  const orderClause = newestFirst ? sql`ORDER BY id DESC` : sql``;

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
          ${orderClause}
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
          ${orderClause}
          LIMIT ${limit}
        `;

  const result = (await db.execute(query)) as unknown as ExecuteResult;
  return result.rows.map((row) => row.id as string);
};
