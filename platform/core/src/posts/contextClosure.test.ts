import { describe, expect, it } from 'vitest';
import type { PgDb } from '../db/pg/client';
import { collectReplyClosureIds } from './contextClosure';

describe('collectReplyClosureIds', () => {
  it('returns empty for missing start or zero limit', async () => {
    const db = { execute: async () => ({ rows: [] }) } as unknown as PgDb;
    expect(await collectReplyClosureIds(db, '', 'descendents')).toEqual([]);
    expect(
      await collectReplyClosureIds(db, 'root', 'ancestors', { limit: 0 }),
    ).toEqual([]);
  });

  it('maps CTE rows to ids for descendants and ancestors', async () => {
    const calls: string[] = [];
    const db = {
      execute: async (query: { queryChunks?: unknown[] }) => {
        calls.push(JSON.stringify(query));
        return {
          rows: [{ id: 'a' }, { id: 'b' }],
        };
      },
    } as unknown as PgDb;

    expect(await collectReplyClosureIds(db, 'root', 'descendents')).toEqual([
      'a',
      'b',
    ]);
    expect(await collectReplyClosureIds(db, 'leaf', 'ancestors')).toEqual([
      'a',
      'b',
    ]);
    expect(calls).toHaveLength(2);
  });

  it('passes maxDepth and limit into the CTE query', async () => {
    let queryJson = '';
    const db = {
      execute: async (query: unknown) => {
        queryJson = JSON.stringify(query);
        return { rows: [{ id: 'only' }] };
      },
    } as unknown as PgDb;

    const ids = await collectReplyClosureIds(db, 'root', 'descendents', {
      limit: 3,
      maxDepth: 10,
    });
    expect(ids).toEqual(['only']);
    expect(queryJson).toContain('10');
    expect(queryJson).toContain('3');
  });
});
