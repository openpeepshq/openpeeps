import { beforeEach, describe, expect, it, vi } from 'vitest';
import { assertKnownColumns, listExplorerTables, quoteIdent } from './tables';
import {
  buildFilterClause,
  clampLimit,
  DEFAULT_ROW_LIMIT,
  MAX_ROW_LIMIT,
} from './query';
import { rowsToCsv } from './csv';
import { runExplorerSql, SQL_MAX_ROWS, SQL_STATEMENT_TIMEOUT_MS } from './sql';

const mockQuery = vi.fn();
const mockRelease = vi.fn();
const mockConnect = vi.fn();

vi.mock('../pg/client', () => ({
  pgPool: () => ({
    connect: () => mockConnect(),
    query: mockQuery,
  }),
}));

describe('db explorer tables', () => {
  it('lists drizzle schema tables including accounts and user_groups', () => {
    const names = listExplorerTables().map((t) => t.name);
    expect(names).toContain('accounts');
    expect(names).toContain('user_groups');
    expect(names).toEqual([...names].sort((a, b) => a.localeCompare(b)));
  });

  it('describes primary keys and column types', () => {
    const accounts = listExplorerTables().find((t) => t.name === 'accounts');
    expect(accounts).toBeTruthy();
    const id = accounts!.columns.find((c) => c.name === 'id');
    expect(id?.primaryKey).toBe(true);
    expect(accounts!.columns.some((c) => c.name === 'email')).toBe(true);
  });

  it('rejects unknown tables and columns', () => {
    expect(() => assertKnownColumns('nope', ['id'])).toThrow(/Unknown table/);
    expect(() => assertKnownColumns('accounts', ['not_a_column'])).toThrow(
      /Unknown column/,
    );
  });

  it('quotes safe identifiers and rejects unsafe ones', () => {
    expect(quoteIdent('accounts')).toBe('"accounts"');
    expect(() => quoteIdent('accounts;drop')).toThrow(/Invalid identifier/);
  });
});

describe('db explorer filters', () => {
  it('builds ILIKE clauses for allowlisted columns', () => {
    const params: unknown[] = [];
    const where = buildFilterClause(
      'accounts',
      { email: 'alice', id: 'abc' },
      params,
    );
    expect(where).toBe(' WHERE "email"::text ILIKE $1 AND "id"::text ILIKE $2');
    expect(params).toEqual(['%alice%', '%abc%']);
  });

  it('returns empty clause without filters', () => {
    expect(buildFilterClause('accounts', undefined, [])).toBe('');
    expect(buildFilterClause('accounts', {}, [])).toBe('');
  });

  it('rejects unknown filter columns', () => {
    expect(() => buildFilterClause('accounts', { nope: 'x' }, [])).toThrow(
      /Unknown column/,
    );
  });

  it('clamps row limits', () => {
    expect(clampLimit(undefined, MAX_ROW_LIMIT)).toBe(DEFAULT_ROW_LIMIT);
    expect(clampLimit(0, MAX_ROW_LIMIT)).toBe(DEFAULT_ROW_LIMIT);
    expect(clampLimit(MAX_ROW_LIMIT + 1, MAX_ROW_LIMIT)).toBe(MAX_ROW_LIMIT);
    expect(clampLimit(50, MAX_ROW_LIMIT)).toBe(50);
  });
});

describe('db explorer csv', () => {
  it('escapes commas and serializes objects as JSON', () => {
    const csv = rowsToCsv(
      ['id', 'body', 'note'],
      [
        { id: '1', body: { a: 1 }, note: 'hello, world' },
        { id: '2', body: null, note: 'plain' },
      ],
    );
    expect(csv).toBe(
      ['id,body,note', '1,"{""a"":1}","hello, world"', '2,,plain'].join('\n'),
    );
  });
});

describe('db explorer sql', () => {
  beforeEach(() => {
    mockQuery.mockReset();
    mockRelease.mockReset();
    mockConnect.mockReset();
    mockConnect.mockResolvedValue({
      query: mockQuery,
      release: mockRelease,
    });
  });

  it('rejects empty statements', async () => {
    await expect(runExplorerSql('   ')).rejects.toThrow(/empty/);
  });

  it('sets statement timeout and caps returned rows', async () => {
    const manyRows = Array.from({ length: SQL_MAX_ROWS + 5 }, (_, i) => ({
      n: i,
    }));
    mockQuery
      .mockResolvedValueOnce(undefined) // SET statement_timeout
      .mockResolvedValueOnce({
        rows: manyRows,
        fields: [{ name: 'n' }],
        rowCount: manyRows.length,
        command: 'SELECT',
      })
      .mockResolvedValueOnce(undefined); // reset timeout

    const result = await runExplorerSql('SELECT 1', { limit: SQL_MAX_ROWS });
    expect(mockQuery.mock.calls[0]?.[0]).toBe(
      `SET statement_timeout = ${SQL_STATEMENT_TIMEOUT_MS}`,
    );
    expect(result.rows).toHaveLength(SQL_MAX_ROWS);
    expect(result.columns).toEqual(['n']);
    expect(result.command).toBe('SELECT');
    expect(mockRelease).toHaveBeenCalledOnce();
  });

  it('respects a smaller requested limit', async () => {
    mockQuery
      .mockResolvedValueOnce(undefined)
      .mockResolvedValueOnce({
        rows: [{ n: 1 }, { n: 2 }, { n: 3 }],
        fields: [{ name: 'n' }],
        rowCount: 3,
        command: 'SELECT',
      })
      .mockResolvedValueOnce(undefined);

    const result = await runExplorerSql('SELECT 1', { limit: 2 });
    expect(result.rows).toHaveLength(2);
    expect(result.rowCount).toBe(3);
  });
});
