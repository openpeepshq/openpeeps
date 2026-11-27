import { sql } from 'drizzle-orm';
import { index, jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { idColumn } from './base';

/**
 * Immutable audit trail of admin actions (user-data and moderation).
 * Rows are append-only: no `updated_at`/`deleted_at`, and there is no
 * retention job — the log is kept indefinitely.
 */
export const auditLogs = pgTable(
  'audit_logs',
  {
    id: idColumn(),
    actorProfileId: text('actor_profile_id').notNull(),
    actorAccountId: text('actor_account_id'),
    // Stores the client-supplied `X-Forwarded-For` value at write time (see
    // `clientIp`). It is not verified against the proxy and rows are
    // immutable, so treat `actor_ip` as untrusted provenance — a client can
    // set it arbitrarily before the TLS proxy.
    actorIp: text('actor_ip'),
    action: text('action').notNull(),
    targetType: text('target_type').notNull(),
    targetId: text('target_id'),
    targetLabel: text('target_label'),
    metadata: jsonb('metadata'),
    createdAt: timestamp('created_at', { withTimezone: true, mode: 'string' })
      .notNull()
      .default(sql`now()`),
  },
  (table) => [
    index('audit_logs_created_at_idx').on(table.createdAt.desc()),
    index('audit_logs_actor_profile_idx').on(table.actorProfileId),
    index('audit_logs_target_idx').on(table.targetType, table.targetId),
  ],
);

export type AuditLogRow = typeof auditLogs.$inferSelect;
