import { and, desc, eq, lt, or } from 'drizzle-orm';
import type { AuditLogRow } from '../db/pg/schema';
import { auditLogs } from '../db/pg/schema';
import { allpeepDb } from '../db';

export interface ListAuditEntriesOptions {
  /**
   * Cursor: only entries strictly older than `(before, beforeId)`.
   * `before` is the `created_at` (ISO string) and `beforeId` is the `id` of
   * the last row of the previous page; both are used together so that rows
   * tying on `created_at` with the boundary row are not skipped. `before`
   * alone (no `beforeId`) degrades to "older than this timestamp".
   */
  before?: string;
  beforeId?: string;
  limit?: number;
  actorProfileId?: string;
  targetType?: string;
  targetId?: string;
}

const DEFAULT_LIMIT = 100;
const MAX_LIMIT = 1000;

/**
 * Newest-first, cursor-paginated listing. `before` is the `created_at` of the
 * last row of the previous page ("older page"); rows are immutable, and tied
 * timestamps are ordered by `id desc` for deterministic pages.
 *
 * `limit` is clamped defensively with an explicit `Number()` so the bound
 * holds whether the value arrived as a number or a numeric string (the direct
 * `.handle()` call path bypasses Riddl's query coercion, which a real request
 * would have already applied).
 */
export const listAuditEntries = async (
  options: ListAuditEntriesOptions = {},
): Promise<AuditLogRow[]> => {
  const limit = Math.min(
    Math.max(Number(options.limit ?? DEFAULT_LIMIT), 1),
    MAX_LIMIT,
  );
  const cursor =
    options.before && options.beforeId
      ? or(
          lt(auditLogs.createdAt, options.before),
          and(
            eq(auditLogs.createdAt, options.before),
            lt(auditLogs.id, options.beforeId),
          ),
        )
      : options.before
        ? lt(auditLogs.createdAt, options.before)
        : undefined;

  const conditions = [
    cursor,
    options.actorProfileId
      ? eq(auditLogs.actorProfileId, options.actorProfileId)
      : undefined,
    options.targetType
      ? eq(auditLogs.targetType, options.targetType)
      : undefined,
    options.targetId ? eq(auditLogs.targetId, options.targetId) : undefined,
  ].filter(Boolean);

  const { db } = await allpeepDb();
  return db
    .select()
    .from(auditLogs)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(auditLogs.createdAt), desc(auditLogs.id))
    .limit(limit);
};
