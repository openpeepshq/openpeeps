import { aql, Database } from 'arangojs';
import { getTableName, sql, type Table } from 'drizzle-orm';
import { logger } from '../../log';
import { pgDb } from '../pg/client';
import { getTableForCollection } from '../pg/map/registry';
import { connectArango } from './exportArango';
import { arangoConfig, DOCUMENT_IMPORT_ORDER } from './shared';

const log = logger('core:migration:detect');

const ARANGO_SOURCE_COLLECTIONS = ['accounts', 'profiles', 'posts'] as const;

export const tableCount = async (collection: string): Promise<number> => {
  const table = getTableForCollection(collection);
  const tableName = getTableName(table as Table);
  const db = pgDb();
  const result = await db.execute<{ count: string }>(
    sql.raw(`SELECT COUNT(*)::text AS count FROM "${tableName}"`),
  );
  return Number(result.rows[0]?.count ?? 0);
};

export const isPostgresEmpty = async (): Promise<boolean> => {
  for (const collection of DOCUMENT_IMPORT_ORDER) {
    if ((await tableCount(collection)) > 0) {
      return false;
    }
  }
  return true;
};

export const isArangoAvailable = async (): Promise<boolean> => {
  const config = arangoConfig();
  const systemDb = new Database({ url: config.url, databaseName: '_system' });
  try {
    return Boolean(await systemDb.availability());
  } catch {
    return false;
  }
};

export const arangoHasSourceData = async (): Promise<boolean> => {
  if (!(await isArangoAvailable())) {
    return false;
  }

  const config = arangoConfig();
  if (config.databaseName) {
    const systemDb = new Database({ ...config, databaseName: '_system' });
    if (!(await systemDb.database(config.databaseName).exists())) {
      log.info(
        'Arango database %s does not exist; skipping auto migration',
        config.databaseName,
      );
      return false;
    }
  }

  const db = connectArango();

  for (const collectionName of ARANGO_SOURCE_COLLECTIONS) {
    if (!(await db.collection(collectionName).exists())) {
      continue;
    }

    const cursor = await db.query(aql`
      RETURN LENGTH(FOR doc IN ${db.collection(collectionName)} LIMIT 1 RETURN 1)
    `);
    const hasDocuments = (await cursor.next()) === 1;
    if (hasDocuments) {
      return true;
    }
  }

  return false;
};
