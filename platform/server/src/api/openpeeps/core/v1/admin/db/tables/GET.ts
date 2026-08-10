import { endpoint } from '#lib/endpoint';
import { forbidden, badRequest } from '#lib/errors';
import { explorerTablesResponseSchema } from '@openpeepshq/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
import { listExplorerTables } from '@openpeepshq/core/db';

export const Output = explorerTablesResponseSchema;

export const Error = {
  403: forbidden(),
  400: badRequest(),
};

export const apiEndpoint = endpoint({ Output, Error }).handle(
  async (_, event) => {
    await ensureRoleCapabilities(event, ['core-db-access']);
    return { tables: listExplorerTables() };
  },
);
