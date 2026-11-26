import { beforeEach, describe, expect, it, vi } from 'vitest';

// `loadPublicNote` makes two queries: the posts row (dispatched on the
// `body` projection) and the mention→profiles join (dispatched on the `uri`
// projection). The SQL filters that scope the join to federated, non-deleted
// profiles (`type = 'federated'`, `deletedAt IS NULL`) are Postgres-enforced
// and are exercised end-to-end by the activitypub harness; this unit test pins
// the JS-side contract: the join returns the mentionee actor URIs, and the
// null-`uri` guard drops any row without one (the one condition enforced in
// code rather than in SQL).
const postRows: Array<Record<string, unknown>> = [];
const mentionRows: Array<Record<string, unknown>> = [];

vi.mock('../db/pg/client', () => {
  const makeBuilder = (rows: Array<Record<string, unknown>>) => {
    const thenable: Record<string, unknown> = {
      then: (resolve: (v: unknown) => void) =>
        Promise.resolve(rows).then(resolve),
      from: () => thenable,
      innerJoin: () => thenable,
      where: () => thenable,
      limit: () => Promise.resolve(rows),
    };
    return thenable;
  };
  return {
    pgDb: () => ({
      select: (selection: Record<string, unknown>) =>
        makeBuilder('body' in selection ? postRows : mentionRows),
    }),
  };
});

const { loadPublicNote } = await import('./notes');

const notePostRow = () => ({
  id: 'post-1',
  type: 'note',
  visibility: 'public',
  creatorId: 'local-1',
  body: { content: 'hello' },
  inReplyToUri: null,
  createdAt: '2026-01-01T00:00:00.000Z',
  deletedAt: null,
});

describe('loadPublicNote mentionUris', () => {
  beforeEach(() => {
    postRows.length = 0;
    mentionRows.length = 0;
  });

  it('returns the mentionee actor URIs for a public note', async () => {
    postRows.push(notePostRow());
    mentionRows.push(
      { uri: 'https://mastodon.social/users/bob' },
      { uri: 'https://pleroma.example/users/carol' },
    );

    const note = await loadPublicNote('post-1');

    expect(note).not.toBeNull();
    expect(note?.content).toBe('hello');
    expect(note?.mentionUris).toEqual([
      'https://mastodon.social/users/bob',
      'https://pleroma.example/users/carol',
    ]);
  });

  it('drops mention rows with a null uri', async () => {
    postRows.push(notePostRow());
    mentionRows.push(
      { uri: 'https://mastodon.social/users/bob' },
      { uri: null },
      { uri: undefined },
    );

    const note = await loadPublicNote('post-1');

    expect(note?.mentionUris).toEqual(['https://mastodon.social/users/bob']);
  });

  it('returns an empty mentionUris array when there are no mentions', async () => {
    postRows.push(notePostRow());

    const note = await loadPublicNote('post-1');

    expect(note?.mentionUris).toEqual([]);
  });

  it('returns null for a non-public note (mention query never reached)', async () => {
    postRows.push({ ...notePostRow(), visibility: 'private' });
    mentionRows.push({ uri: 'https://mastodon.social/users/bob' });

    expect(await loadPublicNote('post-1')).toBeNull();
  });

  it('returns null for a non-note post', async () => {
    postRows.push({ ...notePostRow(), type: 'repost' });

    expect(await loadPublicNote('post-1')).toBeNull();
  });
});
