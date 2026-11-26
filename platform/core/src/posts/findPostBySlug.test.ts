import { beforeEach, describe, expect, it, vi } from 'vitest';

import { allpeepDb } from '../db';

vi.mock('../db', async (importOriginal) => ({
  ...(await importOriginal()),
  allpeepDb: vi.fn(),
}));
vi.mock('../profiles/finders', () => ({
  findProfileByHandle: vi.fn(),
}));

import { findProfileByHandle } from '../profiles/finders';
import { findPostBySlug } from './finders';

/** Flatten a drizzle `sql`` node into its SQL text (params inlined). */
const sqlToText = (node: unknown): string => {
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(sqlToText).join('');
  if (node && typeof node === 'object') {
    if ('queryChunks' in node)
      return sqlToText((node as { queryChunks: unknown }).queryChunks);
    if ('value' in node) {
      const v = (node as { value: unknown }).value;
      if (typeof v === 'string') return v;
      if (Array.isArray(v)) return v.map(String).join('');
    }
    // A drizzle Column (posts.creatorId, …) renders as its SQL name.
    if (typeof (node as { name?: unknown }).name === 'string')
      return (node as { name: string }).name;
  }
  return '$param';
};

const installDb = (rows: unknown[] = []) => {
  let captured: string | null = null;
  const db = {
    select: () => ({
      from: () => ({
        where: (sql: unknown) => {
          captured = sqlToText(sql);
          return { limit: () => Promise.resolve(rows) };
        },
      }),
    }),
  };
  vi.mocked(allpeepDb).mockResolvedValue({ db: db as never });
  return () => captured;
};

beforeEach(() => {
  vi.mocked(findProfileByHandle).mockReset();
});

describe('findPostBySlug scope resolution (mirrors the partial unique indexes)', () => {
  it("instance-scoped: constrains body->>instanceScoped to the string 'true'", async () => {
    const where = installDb([]);
    await findPostBySlug('my-article', undefined, true);
    expect(where()).not.toBeNull();
    expect(where()!).toContain("= 'true'");
    // Not the profile-scoped `IS NULL OR 'false'` form.
    expect(where()!).not.toContain('IS NULL OR');
    // No creator constraint for an instance-wide slug.
    expect(where()!).not.toContain('creator_id');
  });

  it("profile-scoped: instanceScoped is NULL or 'false', and pins the creator", async () => {
    vi.mocked(findProfileByHandle).mockResolvedValue({
      id: 'creator-1',
    } as never);
    const where = installDb([]);
    await findPostBySlug('my-article', 'alice', false);
    expect(where()!).toContain('IS NULL OR');
    expect(where()!).toContain("= 'false'");
    expect(where()!).toContain('creator_id');
  });

  it('resolves the profile handle to a creator id before querying', async () => {
    vi.mocked(findProfileByHandle).mockResolvedValue({
      id: 'creator-1',
    } as never);
    installDb([]);
    await findPostBySlug('my-article', 'alice', false);
    expect(findProfileByHandle).toHaveBeenCalledWith('alice');
  });

  it('returns null without querying when the profile does not exist', async () => {
    vi.mocked(findProfileByHandle).mockResolvedValue(null);
    const db = {
      select: () => {
        throw new Error('db must not be queried for a missing profile');
      },
    };
    vi.mocked(allpeepDb).mockResolvedValue({ db: db as never });
    await expect(
      findPostBySlug('my-article', 'ghost', false),
    ).resolves.toBeNull();
  });
});
