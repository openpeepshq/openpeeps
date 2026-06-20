import { getTableName, sql, type Table } from 'drizzle-orm';
import { logger } from '../../log';
import { closePostgres, pgDb } from '../pg/client';
import {
  documentRegistry,
  edgeRegistry,
  getTableForCollection,
} from '../pg/map/registry';
import {
  assertExportDir,
  exportDirFromEnv,
  readManifest,
  sortedChecksum,
} from './shared';

const log = logger('core:migration:validate');

type ValidationIssue = {
  collection: string;
  kind: 'count' | 'checksum';
  expected: string | number;
  actual: string | number;
};

const tableCount = async (collection: string): Promise<number> => {
  const table = getTableForCollection(collection);
  const tableName = getTableName(table as Table);
  const db = pgDb();
  const result = await db.execute<{ count: string }>(
    sql.raw(`SELECT COUNT(*)::text AS count FROM "${tableName}"`),
  );
  return Number(result.rows[0]?.count ?? 0);
};

const accountEmailChecksum = async (): Promise<string> => {
  const db = pgDb();
  const rows = await db.execute<{ email: string }>(
    sql`SELECT email FROM accounts ORDER BY email`,
  );
  return sortedChecksum(rows.rows.map((row) => row.email));
};

const postIdChecksum = async (): Promise<string> => {
  const db = pgDb();
  const rows = await db.execute<{ id: string }>(
    sql`SELECT id FROM posts ORDER BY id`,
  );
  return sortedChecksum(rows.rows.map((row) => row.id));
};

export const validateMigration = async (exportDir = exportDirFromEnv()) => {
  await assertExportDir(exportDir);
  const manifest = await readManifest(exportDir);
  const issues: ValidationIssue[] = [];

  const collections = [
    ...Object.keys(documentRegistry),
    ...Object.keys(edgeRegistry),
  ];

  for (const collection of collections) {
    const expected = manifest.collections[collection] ?? 0;
    const actual = await tableCount(collection);
    if (expected !== actual) {
      issues.push({ collection, kind: 'count', expected, actual });
    }
  }

  const emailChecksum = await accountEmailChecksum();
  if (emailChecksum !== manifest.checksums.accountEmails) {
    issues.push({
      collection: 'accounts',
      kind: 'checksum',
      expected: manifest.checksums.accountEmails,
      actual: emailChecksum,
    });
  }

  const postsChecksum = await postIdChecksum();
  if (postsChecksum !== manifest.checksums.postIds) {
    issues.push({
      collection: 'posts',
      kind: 'checksum',
      expected: manifest.checksums.postIds,
      actual: postsChecksum,
    });
  }

  await closePostgres();

  if (issues.length === 0) {
    log.info('Validation passed for export %s', exportDir);
    return { ok: true as const, issues };
  }

  for (const issue of issues) {
    log.error(
      'Validation failed for %s (%s): expected %s, got %s',
      issue.collection,
      issue.kind,
      issue.expected,
      issue.actual,
    );
  }

  return { ok: false as const, issues };
};
