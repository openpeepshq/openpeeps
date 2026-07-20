import { endpoint } from '#lib/endpoint';
import { forbidden, badRequest } from '#lib/errors';
import {
  explorerSqlInputSchema,
  explorerSqlResponseSchema,
} from '@openpeeps/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
import { runExplorerSql } from '@openpeeps/core/db/explorer';

export const Input = explorerSqlInputSchema;
export const Output = explorerSqlResponseSchema;

export const Error = {
  403: forbidden(),
  400: badRequest(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-db-access']);
    try {
      return await runExplorerSql(input.statement, { limit: input.limit });
    } catch (err) {
      const message =
        err instanceof globalThis.Error ? err.message : String(err);
      throw badRequest(message);
    }
  },
);
