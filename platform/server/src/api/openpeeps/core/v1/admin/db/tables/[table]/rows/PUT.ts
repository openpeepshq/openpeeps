import { endpoint, z } from '#lib/endpoint';
import { forbidden, badRequest, notFound } from '#lib/errors';
import {
  explorerUpdateRowInputSchema,
  explorerUpdateRowResponseSchema,
} from '@openpeepshq/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
import { auditAction } from '#lib/audit';
import { updateExplorerRow } from '@openpeepshq/core/db';

export const Param = z.object({
  table: z.string(),
});

export const Input = explorerUpdateRowInputSchema;
export const Output = explorerUpdateRowResponseSchema;

export const Error = {
  403: forbidden(),
  400: badRequest(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-db-access']);
    try {
      const result = await updateExplorerRow({
        table: input.table,
        primaryKey: input.primaryKey,
        patch: input.patch,
      });

      if (event.context.currentProfile) {
        // Log the primary key only — row values can contain personal data.
        void auditAction(event, event.context.currentProfile, {
          action: 'db.explorer.update',
          targetType: 'db',
          targetId: input.table,
          targetLabel: input.table,
          metadata: { primaryKey: input.primaryKey },
        });
      }

      return result;
    } catch (err) {
      const message =
        err instanceof globalThis.Error ? err.message : String(err);
      if (
        message.startsWith('Unknown table') ||
        message.startsWith('No row updated')
      ) {
        throw notFound(message);
      }
      throw badRequest(message);
    }
  },
);
