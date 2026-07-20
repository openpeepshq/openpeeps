import { getTableName } from 'drizzle-orm';
import { initPostgres, pgPool } from './pg/client';
import { schema } from './pg/schema';

export const empty = async () => {
  await initPostgres();
  const tableNames = Object.values(schema).map((table) =>
    getTableName(table as never),
  );
  if (tableNames.length === 0) {
    return;
  }
  const quoted = tableNames.map((name) => `"${name}"`).join(', ');
  await pgPool().query(`TRUNCATE ${quoted} RESTART IDENTITY CASCADE`);
  console.log(`Truncated ${tableNames.length} tables`);
};
