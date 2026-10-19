import { describe, expect, it } from 'vitest';
import type { PgDb } from '../db/pg/client';
import {
  findLatestOneToOneLeafId,
  oneToOneOtherId,
  resolveOneToOneReplyId,
} from './conversationQueries';

type ExecuteResult = { rows: Record<string, unknown>[] };

const rowDb = (rows: Record<string, unknown>[]) =>
  ({
    execute: async () => ({ rows }) as ExecuteResult,
  }) as unknown as PgDb;

describe('oneToOneOtherId', () => {
  it('returns the other person when the audience includes the creator', () => {
    expect(oneToOneOtherId('me', ['me', 'them'])).toBe('them');
  });

  it('returns the other person when the audience is only them', () => {
    expect(oneToOneOtherId('me', ['them'])).toBe('them');
  });

  it('skips group threads and posts with no other participant', () => {
    expect(oneToOneOtherId('me', ['a', 'b'])).toBeUndefined();
    expect(oneToOneOtherId('me', ['me'])).toBeUndefined();
    expect(oneToOneOtherId('me', [])).toBeUndefined();
  });
});

describe('findLatestOneToOneLeafId', () => {
  it('returns the newest leaf from the query', async () => {
    const db = rowDb([{ leaf_id: 'leaf-new' }]);
    await expect(findLatestOneToOneLeafId(db, 'me', 'them')).resolves.toBe(
      'leaf-new',
    );
  });

  it('returns undefined when the pair has no thread', async () => {
    const db = rowDb([]);
    await expect(
      findLatestOneToOneLeafId(db, 'me', 'them'),
    ).resolves.toBeUndefined();
  });

  it('looks up direct threads for both profiles', async () => {
    let captured = '';
    const db = {
      execute: async (query: unknown) => {
        captured = JSON.stringify(query);
        return { rows: [] } as ExecuteResult;
      },
    } as unknown as PgDb;
    await findLatestOneToOneLeafId(db, 'profile-a', 'profile-b');
    expect(captured).toContain('RECURSIVE');
    expect(captured).toContain('direct');
    expect(captured).toContain('reply_to');
    expect(captured).toContain('profile-a');
    expect(captured).toContain('profile-b');
  });
});

describe('resolveOneToOneReplyId', () => {
  const queryingDb = () => {
    const calls: unknown[] = [];
    const db = {
      execute: async (query: unknown) => {
        calls.push(query);
        return { rows: [{ leaf_id: 'existing-leaf' }] } as ExecuteResult;
      },
    } as unknown as PgDb;
    return { db, calls };
  };

  it('keeps an explicit reply', async () => {
    const { db, calls } = queryingDb();
    await expect(
      resolveOneToOneReplyId(db, {
        creatorId: 'me',
        audienceIds: ['them'],
        visibility: 'direct',
        inReplyToId: 'parent',
      }),
    ).resolves.toBe('parent');
    expect(calls).toHaveLength(0);
  });

  it('does not fold group posts or multi-person threads into a 1-1', async () => {
    const { db, calls } = queryingDb();
    await expect(
      resolveOneToOneReplyId(db, {
        creatorId: 'me',
        audienceIds: ['them'],
        visibility: 'direct',
        groupId: 'group-1',
      }),
    ).resolves.toBeUndefined();
    await expect(
      resolveOneToOneReplyId(db, {
        creatorId: 'me',
        audienceIds: ['a', 'b'],
        visibility: 'direct',
      }),
    ).resolves.toBeUndefined();
    await expect(
      resolveOneToOneReplyId(db, {
        creatorId: 'me',
        audienceIds: ['them'],
        visibility: 'local',
      }),
    ).resolves.toBeUndefined();
    expect(calls).toHaveLength(0);
  });

  it('appends a 1-1 direct post to the latest thread for the pair', async () => {
    const { db } = queryingDb();
    await expect(
      resolveOneToOneReplyId(db, {
        creatorId: 'me',
        audienceIds: ['me', 'them'],
        visibility: 'direct',
      }),
    ).resolves.toBe('existing-leaf');
  });
});
