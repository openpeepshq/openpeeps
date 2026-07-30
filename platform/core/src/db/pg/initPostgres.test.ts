import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const runMigrations = vi.fn();
const assertSchemaReady = vi.fn();

vi.mock('./migrate', () => ({
  runMigrations: (...args: unknown[]) => runMigrations(...args),
  assertSchemaReady: (...args: unknown[]) => assertSchemaReady(...args),
}));

const mockQuery = vi.fn();
const mockClientQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn();
const mockEnd = vi.fn();
const mockOn = vi.fn();

vi.mock('pg', () => ({
  default: {
    Pool: vi.fn(() => ({
      query: mockQuery,
      connect: mockConnect,
      on: mockOn,
      end: mockEnd,
    })),
  },
}));

const { closePostgres, initPostgres } = await import('./client');

describe('initPostgres migrate-on-boot gate', () => {
  beforeEach(() => {
    runMigrations.mockReset().mockResolvedValue(undefined);
    assertSchemaReady.mockReset().mockResolvedValue(undefined);
    mockQuery.mockReset().mockResolvedValue({ rows: [] });
    mockClientQuery.mockReset().mockResolvedValue({ rows: [] });
    mockRelease.mockReset();
    mockConnect.mockReset().mockResolvedValue({
      query: mockClientQuery,
      release: mockRelease,
    });
    mockEnd.mockReset().mockResolvedValue(undefined);
    delete process.env.RUN_DB_MIGRATE_ON_BOOT;
  });

  afterEach(async () => {
    delete process.env.RUN_DB_MIGRATE_ON_BOOT;
    await closePostgres();
  });

  it('runs migrations by default (local/dev)', async () => {
    await initPostgres();
    expect(runMigrations).toHaveBeenCalledOnce();
    expect(assertSchemaReady).not.toHaveBeenCalled();
  });

  it('checks schema only when RUN_DB_MIGRATE_ON_BOOT=false', async () => {
    process.env.RUN_DB_MIGRATE_ON_BOOT = 'false';
    await initPostgres();
    expect(assertSchemaReady).toHaveBeenCalledOnce();
    expect(runMigrations).not.toHaveBeenCalled();
  });

  it('still migrates when RUN_DB_MIGRATE_ON_BOOT is not false', async () => {
    process.env.RUN_DB_MIGRATE_ON_BOOT = 'true';
    await initPostgres();
    expect(runMigrations).toHaveBeenCalledOnce();
    expect(assertSchemaReady).not.toHaveBeenCalled();
  });
});
