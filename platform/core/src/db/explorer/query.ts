import type { ExplorerRowsResponse } from '@openpeeps/common/types';
import { pgPool } from '../pg/client';
import {
  assertKnownColumns,
  describeExplorerTable,
  getExplorerTable,
  primaryKeyColumns,
  quoteIdent,
} from './tables';

export const DEFAULT_ROW_LIMIT = 100;
/** Hard cap for browse page sizes (50 / 200 / 1000 / All). */
export const MAX_ROW_LIMIT = 10_000;
export const MAX_EXPORT_LIMIT = 10_000;

export type ListRowsInput = {
  table: string;
  filters?: Record<string, string>;
  limit?: number;
  offset?: number;
  orderBy?: string;
};

export const clampLimit = (limit: number | undefined, max: number): number => {
  const n = limit ?? DEFAULT_ROW_LIMIT;
  if (!Number.isFinite(n) || n < 1) return DEFAULT_ROW_LIMIT;
  return Math.min(Math.floor(n), max);
};

export const buildFilterClause = (
  tableName: string,
  filters: Record<string, string> | undefined,
  params: unknown[],
): string => {
  if (!filters || !Object.keys(filters).length) return '';
  assertKnownColumns(tableName, Object.keys(filters));
  const parts = Object.entries(filters).map(([col, value]) => {
    params.push(`%${value}%`);
    return `${quoteIdent(col)}::text ILIKE $${params.length}`;
  });
  return ` WHERE ${parts.join(' AND ')}`;
};

export const listExplorerRows = async (
  input: ListRowsInput,
  options?: { maxLimit?: number },
): Promise<ExplorerRowsResponse> => {
  const tableName = input.table;
  const meta = describeExplorerTable(getExplorerTable(tableName));
  const maxLimit = options?.maxLimit ?? MAX_ROW_LIMIT;
  const limit = clampLimit(input.limit, maxLimit);
  const offset = Math.max(0, Math.floor(input.offset ?? 0));

  const orderCol =
    input.orderBy ??
    primaryKeyColumns(tableName)[0]?.name ??
    meta.columns[0]?.name;
  if (!orderCol) {
    throw new Error(`Table ${tableName} has no columns`);
  }
  assertKnownColumns(tableName, [orderCol]);

  const filterParams: unknown[] = [];
  const where = buildFilterClause(tableName, input.filters, filterParams);
  const tableSql = quoteIdent(tableName);

  const countResult = await pgPool().query<{ count: string }>(
    `SELECT count(*)::text AS count FROM ${tableSql}${where}`,
    filterParams,
  );
  const total = Number(countResult.rows[0]?.count ?? 0);

  const result = await pgPool().query(
    `SELECT * FROM ${tableSql}${where} ORDER BY ${quoteIdent(orderCol)} LIMIT $${filterParams.length + 1} OFFSET $${filterParams.length + 2}`,
    [...filterParams, limit, offset],
  );

  return {
    columns: meta.columns.map((c) => c.name),
    rows: result.rows as ExplorerRowsResponse['rows'],
    total,
    limit,
    offset,
  };
};
