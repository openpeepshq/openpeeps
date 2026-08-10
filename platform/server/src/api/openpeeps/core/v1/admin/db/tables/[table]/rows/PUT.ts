import { endpoint, z } from '#lib/endpoint';
import { forbidden, badRequest, notFound } from '#lib/errors';
import {
  explorerUpdateRowInputSchema,
  explorerUpdateRowResponseSchema,
} from '@openpeepshq/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
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
      return await updateExplorerRow({
        table: input.table,
        primaryKey: input.primaryKey,
        patch: input.patch,
      });
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
