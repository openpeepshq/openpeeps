import { endpoint, z } from '#lib/endpoint';
import { auditLogListQuerySchema } from '@openpeepshq/common/types';
import type { AuditLogEntry } from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { resolveActorFilter } from '#lib/audit';
import { listAuditEntries, mapAuditLogRows } from '@openpeepshq/core/auditLog';

/**
 * Safety cap so a very long-running instance cannot OOM a single export:
 * a full-log export returns at most the 100,000 most recent entries.
 * Disclosed in the PR (the plan's "streams the full log" is realized as
 * "every entry, newest-first, up to this cap").
 */
const MAX_EXPORT_ENTRIES = 100_000;
const PAGE_SIZE = 1000;

export const Query = auditLogListQuerySchema;

export const Output = z.object({
  filename: z.string(),
  contentType: z.string(),
  content: z.string(),
  encoding: z.enum(['utf8', 'base64']),
});

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Query, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-auditLog-read']);
    const actorProfileId = await resolveActorFilter(input.actor);
    // An actor filter that resolves to no profile must match nothing, not be
    // dropped (which would export the whole log).
    if (actorProfileId === null) {
      const date = new Date().toISOString().slice(0, 10);
      return {
        filename: `audit-log-${date}.json`,
        contentType: 'application/json',
        content: JSON.stringify(
          { exportedAt: new Date().toISOString(), entries: [] },
          null,
          2,
        ),
        encoding: 'utf8' as const,
      };
    }

    // The export is the full log: page newest-first with the same filters
    // until a short page arrives (or the safety cap is hit).
    const entries: AuditLogEntry[] = [];
    let before: string | undefined;
    let beforeId: string | undefined;
    for (;;) {
      const rows = await listAuditEntries({
        before,
        beforeId,
        limit: PAGE_SIZE,
        actorProfileId,
        targetType: input.targetType,
        targetId: input.targetId,
      });
      const mapped = mapAuditLogRows(rows);
      entries.push(...mapped);
      if (rows.length < PAGE_SIZE || entries.length >= MAX_EXPORT_ENTRIES) {
        break;
      }
      // Use the mapped (ISO-normalized) cursor — both the timestamp and the
      // `id` of the last row — so the next page passes the query schema and
      // does not skip rows that tie on `created_at` at the page boundary.
      const last = mapped[mapped.length - 1];
      before = last.createdAt;
      beforeId = last.id;
    }

    const date = new Date().toISOString().slice(0, 10);
    return {
      filename: `audit-log-${date}.json`,
      contentType: 'application/json',
      content: JSON.stringify(
        { exportedAt: new Date().toISOString(), entries },
        null,
        2,
      ),
      encoding: 'utf8' as const,
    };
  },
);
