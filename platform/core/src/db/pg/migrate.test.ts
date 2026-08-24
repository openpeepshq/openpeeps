import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const execute = vi.fn();
const resetPostgresSchemas = vi.fn();
const migrate = vi.fn();

vi.mock('./client', () => ({
  pgDb: () => ({ execute }),
  resetPostgresSchemas: (...args: unknown[]) => resetPostgresSchemas(...args),
}));

vi.mock('drizzle-orm/node-postgres/migrator', () => ({
  migrate: (...args: unknown[]) => migrate(...args),
}));

const {
  assertSchemaReady,
  getFirstSchemaVersion,
  getLatestSchemaVersion,
  LEGACY_POSTGRES_BACKUP_SCHEMA_VERSION,
  listSchemaVersions,
  resolveRestoreSchemaVersion,
  runMigrations,
} = await import('./migrate');

const sqlText = (statement: unknown): string => {
  if (!statement || typeof statement !== 'object') {
    return String(statement);
  }
  const chunks = (statement as { queryChunks?: { value?: string[] }[] })
    .queryChunks;
  if (!Array.isArray(chunks)) {
    return String(statement);
  }
  return chunks
    .map((chunk) => (Array.isArray(chunk.value) ? chunk.value.join('') : ''))
    .join('');
};

describe('schema version helpers', () => {
  it('lists journal tags in order', () => {
    const tags = listSchemaVersions();
    expect(tags.length).toBeGreaterThan(0);
    expect(tags[0]).toMatch(/^0000_/);
    expect(getFirstSchemaVersion()).toBe(tags[0]);
    expect(getLatestSchemaVersion()).toBe(tags[tags.length - 1]);
  });

  it('resolves restore targets for arango vs postgres', () => {
    expect(resolveRestoreSchemaVersion('arango')).toBe(getFirstSchemaVersion());
    expect(resolveRestoreSchemaVersion('postgres')).toBe(
      LEGACY_POSTGRES_BACKUP_SCHEMA_VERSION,
    );
    expect(LEGACY_POSTGRES_BACKUP_SCHEMA_VERSION).toBe('0007_shallow_oracle');
    expect(resolveRestoreSchemaVersion('postgres', getLatestSchemaVersion())).toBe(
      getLatestSchemaVersion(),
    );
  });

  it('rejects unknown postgres schemaVersion tags', () => {
    expect(() =>
      resolveRestoreSchemaVersion('postgres', '9999_does_not_exist'),
    ).toThrow(/Unknown Postgres schema version/);
  });
});

describe('assertSchemaReady', () => {
  beforeEach(() => {
    execute.mockReset();
    resetPostgresSchemas.mockReset();
    migrate.mockReset();
  });

  it('passes when every app table exists', async () => {
    execute.mockImplementation(async (statement: unknown) => {
      const text = sqlText(statement);
      if (text.includes('to_regclass')) {
        const table = /public\.(\w+)/.exec(text)?.[1] ?? 'unknown';
        return { rows: [{ regclass: `public.${table}` }] };
      }
      return { rows: [] };
    });

    await expect(assertSchemaReady()).resolves.toBeUndefined();
  });

  it('fails when any app table is missing', async () => {
    execute.mockImplementation(async (statement: unknown) => {
      const text = sqlText(statement);
      if (text.includes('to_regclass')) {
        if (text.includes('public.accounts')) {
          return { rows: [{ regclass: null }] };
        }
        return { rows: [{ regclass: 'public.x' }] };
      }
      return { rows: [] };
    });

    await expect(assertSchemaReady()).rejects.toThrow(
      /schema incomplete.*accounts/i,
    );
  });
});

describe('runMigrations', () => {
  beforeEach(() => {
    execute.mockReset();
    resetPostgresSchemas.mockReset().mockResolvedValue(undefined);
    migrate.mockReset().mockResolvedValue(undefined);
  });

  it('refuses DROP SCHEMA heal when application data exists', async () => {
    migrate.mockResolvedValue(undefined);

    execute.mockImplementation(async (statement: unknown) => {
      const text = sqlText(statement);
      if (text.includes('to_regclass')) {
        // Simulate a half-applied schema: accounts missing, profiles present.
        if (text.includes('public.accounts')) {
          return { rows: [{ regclass: null }] };
        }
        return { rows: [{ regclass: 'public.profiles' }] };
      }
      if (text.includes('SELECT 1 FROM')) {
        if (text.includes('"profiles"')) {
          return { rows: [{ n: '1' }] };
        }
        return { rows: [] };
      }
      return { rows: [] };
    });

    await expect(runMigrations()).rejects.toThrow(/refusing to DROP SCHEMA/);
    expect(resetPostgresSchemas).not.toHaveBeenCalled();
  });

  it('heals empty incomplete schema by resetting', async () => {
    let healed = false;
    migrate.mockImplementation(async () => {
      // First apply leaves tables missing; remigrate after reset succeeds.
    });

    execute.mockImplementation(async (statement: unknown) => {
      const text = sqlText(statement);
      if (text.includes('to_regclass')) {
        if (!healed && text.includes('public.accounts')) {
          return { rows: [{ regclass: null }] };
        }
        const table = /public\.(\w+)/.exec(text)?.[1] ?? 'unknown';
        return { rows: [{ regclass: `public.${table}` }] };
      }
      if (text.includes('SELECT 1 FROM')) {
        return { rows: [] };
      }
      return { rows: [] };
    });

    resetPostgresSchemas.mockImplementation(async () => {
      healed = true;
    });

    await expect(runMigrations()).resolves.toBeUndefined();
    expect(resetPostgresSchemas).toHaveBeenCalledOnce();
  });
});

describe('migrate command wiring', () => {
  it('start.sh exposes migrate → bootMigrate.js', () => {
    const startSh = join(
      dirname(fileURLToPath(import.meta.url)),
      '../../../../../docker/prod/start.sh',
    );
    const contents = readFileSync(startSh, 'utf8');
    expect(contents).toMatch(/migrate\)/);
    expect(contents).toMatch(/bootMigrate\.js/);
  });

  it('bootMigrate entry reuses initDb', () => {
    const bootMigrate = join(
      dirname(fileURLToPath(import.meta.url)),
      '../bootMigrate.ts',
    );
    const contents = readFileSync(bootMigrate, 'utf8');
    expect(contents).toMatch(/initDb/);
    expect(contents).toMatch(/closePostgres/);
  });
});
