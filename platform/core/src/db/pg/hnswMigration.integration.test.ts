import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { pgConnectionString } from './client';

/**
 * The 2560-dim embedding column only fits an HNSW index as `halfvec`
 * (pgvector caps `vector` HNSW at 2000 dims, `halfvec` at 4000). This test
 * runs the real Drizzle migrator over the full migration chain against
 * pgvector Postgres in an isolated temporary database and asserts the 0025
 * HNSW indexes are actually created, so a future dimension bump or opclass
 * regression that reintroduces `column cannot have more than 2000 dimensions
 * for hnsw index` is caught here instead of only surfacing as a red server
 * boot (run 4604).
 *
 * Skips when no pgvector-backed Postgres is reachable (a reachable plain
 * Postgres without pgvector is treated the same — the assertions are
 * pgvector-specific). CI's test-unit job provides `pgvector/pgvector:pg16`.
 */

const MIGRATIONS_FOLDER = join(dirname(fileURLToPath(import.meta.url)), 'sql');

/** True when the reachable Postgres can install the `vector` extension. */
const hasPgvector = await (async () => {
  const client = new pg.Client({
    connectionString: pgConnectionString(),
    connect_timeout: 2,
  });
  try {
    await client.connect();
    // `pg_available_extensions` lists extensions whose control file is
    // present, i.e. that CAN be created here. Absent → no pgvector.
    const { rows } = await client.query<{ ok: unknown }>(
      `SELECT 1 AS ok FROM pg_available_extensions WHERE name = 'vector' LIMIT 1`,
    );
    return rows.length > 0;
  } catch {
    return false;
  } finally {
    await client.end().catch(() => {});
  }
})();

const maybe = hasPgvector ? describe : describe.skip;
if (!hasPgvector) {
  console.warn(
    '[hnswMigration.integration] pgvector-backed Postgres unavailable — HNSW migration test SKIPPED',
  );
}

// Migration 0025 tables that carry an embedding HNSW index.
const EMBEDDING_TABLES = [
  'posts',
  'profiles',
  'jam_transcripts',
  'community_knowledge',
  'topic_centroids',
];

maybe('ai vector store migration (pgvector)', () => {
  let admin: pg.PoolClient;
  let tempPool: pg.Pool;
  let tempDb: pg.PoolClient;
  const tempDatabase = `hnsw_mig_w${process.env.VITEST_POOL_ID ?? '0'}_${process.pid}`;

  beforeAll(async () => {
    const adminPool = new pg.Pool({
      connectionString: pgConnectionString(),
      max: 1,
    });
    admin = await adminPool.connect();
    await admin.query(`DROP DATABASE IF EXISTS "${tempDatabase}"`);
    await admin.query(`CREATE DATABASE "${tempDatabase}"`);
    tempPool = new pg.Pool({
      connectionString: pgConnectionString().replace(
        /\/[^/]+$/,
        `/${tempDatabase}`,
      ),
      max: 2,
    });
    tempDb = await tempPool.connect();
    // Migration 0024 enables the extension on server boot; apply it first so
    // the migrator below sees the same state a booting server has.
    await tempDb.query(`CREATE EXTENSION IF NOT EXISTS vector`);
    // The real Drizzle migrator (journal, statement splitting, breakpoint
    // handling) pointed at the isolated database — the same code path server
    // boot uses, just on a throwaway schema.
    await migrate(drizzle(tempPool as never), {
      migrationsFolder: MIGRATIONS_FOLDER,
    });
  }, 90_000);

  afterAll(async () => {
    tempDb?.release?.();
    await tempPool?.end().catch(() => {});
    await admin
      ?.query(`DROP DATABASE IF EXISTS "${tempDatabase}"`)
      .catch(() => {});
    await admin?.end().catch(() => {});
  });

  it('creates every embedding column as halfvec(2560)', async () => {
    const { rows } = await tempDb.query<{
      format_type: string;
      table: string;
    }>(
      `SELECT format_type(a.atttypid, a.atttypmod) AS format_type, c.relname AS table
       FROM pg_attribute a
       JOIN pg_class c ON c.oid = a.attrelid
       JOIN pg_namespace n ON n.oid = c.relnamespace
       WHERE n.nspname = 'public'
         AND a.attname = 'embedding'
         AND c.relname IN (${EMBEDDING_TABLES.map((t) => `'${t}'`).join(', ')})`,
    );
    expect(rows).toHaveLength(EMBEDDING_TABLES.length);
    for (const row of rows) {
      expect(row.format_type, `${row.table}.embedding`).toBe('halfvec(2560)');
    }
  });

  it('creates the HNSW halfvec_cosine_ops indexes that vector(2560) cannot', async () => {
    const { rows } = await tempDb.query<{
      tablename: string;
      indexdef: string;
    }>(
      `SELECT tablename, indexdef
       FROM pg_indexes
       WHERE schemaname = 'public'
         AND indexdef ILIKE '% USING hnsw %'
         AND indexdef ILIKE '%halfvec_cosine_ops%'
       ORDER BY tablename`,
    );
    const indexedTables = new Set(rows.map((row) => row.tablename));
    for (const table of EMBEDDING_TABLES) {
      expect(indexedTables.has(table), `${table} HNSW index`).toBe(true);
    }
    // pgvector's pg_get_indexdef omits column types, so pull the indexed
    // columns' types from the catalog: every HNSW key column must be
    // halfvec(2560) — the dimension vector(2560) cannot index (`column cannot
    // have more than 2000 dimensions for hnsw index`, run 4604).
    const { rows: typeRows } = await tempDb.query<{ column_type: string }>(
      `SELECT format_type(a.atttypid, a.atttypmod) AS column_type
       FROM pg_index ix
       JOIN pg_class i ON i.oid = ix.indexrelid
       JOIN pg_class c ON c.oid = ix.indrelid
       JOIN pg_am am ON am.oid = i.relam
       JOIN pg_namespace n ON n.oid = c.relnamespace
       JOIN pg_attribute a
         ON a.attrelid = c.oid AND a.attnum = ANY(ix.indkey)
       WHERE n.nspname = 'public' AND am.amname = 'hnsw'`,
    );
    expect(typeRows.length).toBeGreaterThan(0);
    for (const row of typeRows) {
      expect(row.column_type).toBe('halfvec(2560)');
    }
  });
});

// Pure file reads — run even without a reachable Postgres, so a drift
// between the 0025 SQL, the Drizzle schema and the ingest dimension
// contract is caught anywhere.
describe('ai vector store migration (text)', () => {
  const pgDir = dirname(fileURLToPath(import.meta.url));

  it('keeps the 0025 migration text consistent with halfvec', () => {
    const sql = readFileSync(
      join(MIGRATIONS_FOLDER, '0025_add_ai_vector_store.sql'),
      'utf8',
    );
    expect(sql).toContain('halfvec(2560)');
    expect(sql).toContain('halfvec_cosine_ops');
    expect(sql).not.toContain('vector(2560)');
    expect(sql).not.toContain('vector_cosine_ops');
  });

  it('keeps the schema source consistent with the halfvec contract', () => {
    const baseTs = readFileSync(join(pgDir, 'schema', 'base.ts'), 'utf8');
    // The customType's declared width is the source of truth the migration
    // SQL must match — a dimension change here that the 0025 SQL misses
    // would rebuild halfvec with the old width.
    expect(baseTs).toContain('EMBEDDING_DIMENSIONS = 2560');
    expect(baseTs).toContain('`halfvec(${EMBEDDING_DIMENSIONS})`');

    // One HNSW cosine index per embedding table, on the halfvec opclass —
    // a drift to a different opclass (or a dropped index) would desync the
    // schema from the SQL the migration test reads.
    const documentsTs = readFileSync(
      join(pgDir, 'schema', 'documents.ts'),
      'utf8',
    );
    const aiTs = readFileSync(join(pgDir, 'schema', 'ai.ts'), 'utf8');
    const indexCount = (ts: string) =>
      (ts.match(/index\('\w+_embedding_cosine_idx'\)/g) ?? []).length;
    expect(indexCount(documentsTs)).toBe(2); // posts, profiles
    expect(indexCount(aiTs)).toBe(3); // jam_transcripts, community_knowledge, topic_centroids
    const opclassCount = (ts: string) =>
      (ts.match(/op\('halfvec_cosine_ops'\)/g) ?? []).length;
    expect(opclassCount(documentsTs)).toBe(2);
    expect(opclassCount(aiTs)).toBe(3);

    // The ingest dimension constant must stay in lockstep with the schema.
    // base.ts is the single source of truth; constants.ts must re-export it
    // rather than redeclare it, so a future dimension bump updates one site.
    const constantsTs = readFileSync(
      join(pgDir, '../../vectors/constants.ts'),
      'utf8',
    );
    expect(constantsTs).toContain(
      "import { EMBEDDING_DIMENSIONS } from '../db/pg/schema/base'",
    );
    expect(constantsTs).toContain('export { EMBEDDING_DIMENSIONS };');
    // No second, independent declaration of the width anywhere in the plane.
    expect(constantsTs).not.toContain('EMBEDDING_DIMENSIONS = 2560');
  });
});
