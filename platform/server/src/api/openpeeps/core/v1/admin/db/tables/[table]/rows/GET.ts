import { endpoint, z } from '#lib/endpoint';
import { forbidden, badRequest, notFound } from '#lib/errors';
import { explorerRowsResponseSchema } from '@openpeeps/common/types';
import { ensureRoleCapabilities } from '#lib/auth';
import { listExplorerRows } from '@openpeeps/core/db/explorer';

export const Param = z.object({
  table: z.string(),
});

export const Query = z
  .object({
    limit: z.coerce.number().optional(),
    offset: z.coerce.number().optional(),
    orderBy: z.string().optional(),
  })
  .passthrough();

export const Output = explorerRowsResponseSchema;

export const Error = {
  403: forbidden(),
  400: badRequest(),
  404: notFound(),
};

const parseFilters = (
  query: Record<string, unknown>,
): Record<string, string> => {
  const filters: Record<string, string> = {};
  for (const [key, value] of Object.entries(query)) {
    if (!key.startsWith('filter.')) continue;
    const col = key.slice('filter.'.length);
    if (!col || value == null) continue;
    filters[col] = String(Array.isArray(value) ? value[0] : value);
  }
  return filters;
};

export const apiEndpoint = endpoint({ Param, Query, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-db-access']);
    try {
      return await listExplorerRows({
        table: input.table,
        limit: input.limit,
        offset: input.offset,
        orderBy: input.orderBy,
        filters: parseFilters(input as Record<string, unknown>),
      });
    } catch (err) {
      const message =
        err instanceof globalThis.Error ? err.message : String(err);
      if (message.startsWith('Unknown table')) {
        throw notFound(message);
      }
      throw badRequest(message);
    }
  },
);
