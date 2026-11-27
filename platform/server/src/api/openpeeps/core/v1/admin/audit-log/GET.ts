import { endpoint, z } from '#lib/endpoint';
import {
  auditLogEntrySchema,
  auditLogListQuerySchema,
} from '@openpeepshq/common/types';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { resolveActorFilter } from '#lib/audit';
import { listAuditEntries, mapAuditLogRows } from '@openpeepshq/core/auditLog';

export const Query = auditLogListQuerySchema;

export const Output = z.object({
  entries: auditLogEntrySchema.array(),
});

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Query, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-auditLog-read']);
    const actorProfileId = await resolveActorFilter(input.actor);
    if (actorProfileId === null) return { entries: [] };
    const rows = await listAuditEntries({
      before: input.before,
      beforeId: input.beforeId,
      limit: input.limit,
      actorProfileId,
      targetType: input.targetType,
      targetId: input.targetId,
    });
    return { entries: mapAuditLogRows(rows) };
  },
);
