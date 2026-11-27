import { z } from 'zod';

export const auditLogEntrySchema = z.object({
  id: z.string(),
  actorProfileId: z.string(),
  actorAccountId: z.string().nullable(),
  actorIp: z.string().nullable(),
  action: z.string(),
  targetType: z.string(),
  targetId: z.string().nullable(),
  targetLabel: z.string().nullable(),
  metadata: z.record(z.string(), z.unknown()).nullable(),
  createdAt: z.string().datetime(),
});

export type AuditLogEntry = z.infer<typeof auditLogEntrySchema>;

/**
 * Keyset cursor: the `created_at`/`id` of the last row of the previous page.
 * Both parts are required together so a row that ties on `created_at` with the
 * boundary row is not skipped when paging ("older" = strictly below the pair).
 */
export const auditLogCursorSchema = z.object({
  before: z.string().datetime(),
  beforeId: z.string().uuid(),
});

export type AuditLogCursor = z.infer<typeof auditLogCursorSchema>;

export const auditLogListQuerySchema = z.object({
  /** Only entries older than this `created_at`. Pair with `beforeId`. */
  before: z.string().datetime().optional(),
  /** The `id` paired with `before`; rows with the same `created_at` but a lower `id` are the ones returned. */
  beforeId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(1000).optional(),
  actor: z.string().optional(),
  targetType: z.string().optional(),
  targetId: z.string().optional(),
});

export type AuditLogListQuery = z.infer<typeof auditLogListQuerySchema>;
