import type { ProfileWithMeta } from '@openpeepshq/common/types';
import { randomUUID } from 'node:crypto';
import { auditLogs } from '../db/pg/schema';
import { allpeepDb } from '../db';
import { logger } from '../log';

const log = logger('auditLog');

export interface AuditEntryData {
  /** Id of the profile performing the action. */
  actorProfileId: string;
  actorAccountId?: string | null;
  actorIp?: string | null;
  /** e.g. `profile.delete`, `report.resolve`, `role.update`. */
  action: string;
  /** e.g. `profile`, `account`, `report`, `role`, `group`. */
  targetType: string;
  targetId?: string | null;
  /** Human-readable target detail (handle, email, role key…). */
  targetLabel?: string | null;
  /** Action-specific detail; never credentials or full request bodies. */
  metadata?: Record<string, unknown> | null;
}

/** Plain insert — throws on failure. */
export const createAuditEntry = async (data: AuditEntryData) => {
  const { db } = await allpeepDb();
  const [row] = await db
    .insert(auditLogs)
    .values({
      id: randomUUID(),
      actorProfileId: data.actorProfileId,
      actorAccountId: data.actorAccountId ?? null,
      actorIp: data.actorIp ?? null,
      action: data.action,
      targetType: data.targetType,
      targetId: data.targetId ?? null,
      targetLabel: data.targetLabel ?? null,
      metadata: data.metadata ?? null,
    })
    .returning();
  return row;
};

export interface AuditContext {
  /** The actor (already loaded by the auth middleware). */
  profile?: ProfileWithMeta | null;
  /** Client IP at request time (behind the TLS proxy: first XFF hop). */
  ip?: string | null;
}

/**
 * Fire-and-forget audit write: resolves the actor (profile + owning
 * account), inserts one row and swallows its own errors. A failed audit
 * write must never fail the admin action that triggered it — it is logged
 * as a server error.
 */
export const recordAuditEntry = async (
  data: Omit<AuditEntryData, 'actorAccountId' | 'actorProfileId' | 'actorIp'> &
    Partial<Pick<AuditEntryData, 'actorProfileId'>>,
  ctx: AuditContext,
): Promise<void> => {
  try {
    await createAuditEntry({
      actorProfileId: data.actorProfileId ?? ctx.profile?.id ?? '',
      actorAccountId: ctx.profile?.controllers?.[0]?.id ?? null,
      actorIp: ctx.ip ?? null,
      ...data,
    });
  } catch (error) {
    log.error('audit entry write failed:', error);
  }
};
