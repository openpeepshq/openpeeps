import { getTableName, sql, type Table } from 'drizzle-orm';
import { pgDb } from '../pg/client';
import { getTableForCollection } from '../pg/map/registry';

const isUndefinedTableError = (err: unknown): boolean => {
  const candidates = [
    err,
    err && typeof err === 'object' && 'cause' in err
      ? (err as { cause: unknown }).cause
      : undefined,
  ];
  return candidates.some(
    (candidate) =>
      candidate &&
      typeof candidate === 'object' &&
      'code' in candidate &&
      (candidate as { code: unknown }).code === '42P01',
  );
};

export const tableCount = async (collection: string): Promise<number> => {
  const table = getTableForCollection(collection);
  const tableName = getTableName(table as Table);
  const db = pgDb();
  try {
    const result = await db.execute<{ count: string }>(
      sql.raw(`SELECT COUNT(*)::text AS count FROM "${tableName}"`),
    );
    return Number(result.rows[0]?.count ?? 0);
  } catch (err) {
    // Missing table ⇒ treat as empty so callers can remigrate / auto-import.
    if (isUndefinedTableError(err)) {
      return 0;
    }
    throw err;
  }
};

export { isUndefinedTableError };
