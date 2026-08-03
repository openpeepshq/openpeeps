import { endpoint, z } from '#lib/endpoint';
import { forbidden, badRequest, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import {
  listExplorerRows,
  MAX_EXPORT_LIMIT,
  rowsToCsv,
} from '@openpeeps/core/db';

export const Param = z.object({
  table: z.string(),
});

export const Query = z
  .object({
    orderBy: z.string().optional(),
  })
  .passthrough();

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

export const apiEndpoint = endpoint({ Param, Query, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-db-access']);
    try {
      const result = await listExplorerRows(
        {
          table: input.table,
          orderBy: input.orderBy,
          filters: parseFilters(input as Record<string, unknown>),
          limit: MAX_EXPORT_LIMIT,
          offset: 0,
        },
        { maxLimit: MAX_EXPORT_LIMIT },
      );
      const csv = rowsToCsv(result.columns, result.rows);
      return new Response(csv, {
        headers: {
          'Content-Type': 'text/csv; charset=utf-8',
          'Content-Disposition': `attachment; filename="${input.table}.csv"`,
        },
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
