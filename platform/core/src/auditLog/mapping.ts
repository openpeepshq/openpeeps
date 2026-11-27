import type { AuditLogEntry } from '@openpeepshq/common/types';
import { normalizeIsoDatetime } from '../db/pg/mappers';
import type { AuditLogRow } from '../db/pg/schema';

export const mapAuditLogRow = (row: AuditLogRow): AuditLogEntry => ({
  id: row.id,
  actorProfileId: row.actorProfileId,
  actorAccountId: row.actorAccountId,
  actorIp: row.actorIp,
  action: row.action,
  targetType: row.targetType,
  targetId: row.targetId,
  targetLabel: row.targetLabel,
  // `jsonb` columns have no type mode, so drizzle infers `unknown` on read.
  metadata: row.metadata as AuditLogEntry['metadata'],
  // The pg driver returns timestamptz as an offset string
  // (`"2026-11-26 12:00:00.123+00"`); normalize to ISO UTC so the
  // `z.string().datetime()` output schemas accept it.
  createdAt: normalizeIsoDatetime(row.createdAt),
});

export const mapAuditLogRows = (rows: AuditLogRow[]): AuditLogEntry[] =>
  rows.map(mapAuditLogRow);
