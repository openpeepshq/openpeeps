import type { ExplorerSqlResponse } from '@openpeepshq/common/types';
import { pgPool } from '../pg/client';

export const SQL_STATEMENT_TIMEOUT_MS = 15_000;
/** Absolute cap for returned SQL rows (All). */
export const SQL_HARD_MAX_ROWS = 100_000;
/** Default cap when the client does not request a limit. */
export const SQL_DEFAULT_MAX_ROWS = 1_000;
/** @deprecated Use SQL_HARD_MAX_ROWS */
export const SQL_MAX_ROWS = SQL_HARD_MAX_ROWS;

export const runExplorerSql = async (
  statement: string,
  options?: { limit?: number },
): Promise<ExplorerSqlResponse> => {
  const trimmed = statement.trim();
  if (!trimmed) {
    throw new Error('SQL statement is empty');
  }

  const requested = options?.limit;
  const maxRows =
    requested != null && Number.isFinite(requested) && requested > 0
      ? Math.min(Math.floor(requested), SQL_HARD_MAX_ROWS)
      : SQL_DEFAULT_MAX_ROWS;

  const client = await pgPool().connect();
  try {
    await client.query(`SET statement_timeout = ${SQL_STATEMENT_TIMEOUT_MS}`);
    const result = await client.query(trimmed);
    const allRows = result.rows as ExplorerSqlResponse['rows'];
    const rows = allRows.slice(0, maxRows);
    const columns =
      result.fields?.map((f) => f.name) ??
      (rows[0] ? Object.keys(rows[0]) : []);

    return {
      columns,
      rows,
      rowCount: result.rowCount ?? allRows.length,
      command: result.command,
    };
  } finally {
    try {
      await client.query('SET statement_timeout = 0');
    } catch {
      // ignore reset failures on a broken connection
    }
    client.release();
  }
};
