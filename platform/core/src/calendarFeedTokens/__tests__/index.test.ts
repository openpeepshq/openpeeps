import { PgDialect } from 'drizzle-orm/pg-core';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// The token module's only external dep is `allpeepDb()`. The fake db below
// records the drizzle where-clause each call passes, which is then rendered
// to real SQL (via PgDialect) so the assertions pin the query that reaches
// postgres — in particular that the expiry filter is present and live. The
// real sha256 hashing and `and(eq, gt)` composition run unmocked.
vi.mock('../../db', () => ({
  allpeepDb: vi.fn(async () => ({ db: {} })),
}));

import { allpeepDb } from '../../db';
import {
  createCalendarFeedToken,
  findProfileByCalendarFeedToken,
  hashToken,
  revokeAllCalendarFeedTokens,
} from '../index';

const dialect = new PgDialect();

// Captures the per-call `.where()` clause and `.values()` payload; the fake
// chain's terminal `.then` answers with `fakeDbState.rows` (select) or `[]`
// (delete — its `returning` result is read only for its length).
const fakeDbState = vi.hoisted(() => ({
  rows: [] as Array<Record<string, unknown>>,
  whereClause: undefined as unknown,
  values: undefined as Record<string, unknown> | undefined,
}));

const buildChain = (fnName: 'select' | 'insert' | 'delete') => {
  const api = vi.fn(async () => (fnName === 'delete' ? [] : fakeDbState.rows));
  const chain = {
    from: vi.fn(() => chain),
    values: vi.fn((v: Record<string, unknown>) => {
      fakeDbState.values = v;
      return chain;
    }),
    returning: vi.fn(() => chain),
    where: vi.fn((clause: unknown) => {
      fakeDbState.whereClause = clause;
      return chain;
    }),
    limit: vi.fn(() => chain),
    then: (onfulfilled?: unknown) => api().then(onfulfilled),
  };
  (chain as Record<string, unknown>)[fnName] = vi.fn(() => chain);
  return { api, chain };
};

const renderWhere = () => dialect.sqlToQuery(fakeDbState.whereClause as never);

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime('2026-11-20T00:00:00.000Z');
  fakeDbState.rows = [];
  fakeDbState.whereClause = undefined;
  fakeDbState.values = undefined;
  vi.mocked(allpeepDb).mockReset();
  vi.mocked(allpeepDb).mockResolvedValue({ db: {} } as never);
});

describe('findProfileByCalendarFeedToken', () => {
  it('returns null for an expired token: the rendered SQL filters expires_at above now', async () => {
    fakeDbState.rows = [];
    const { api, chain } = buildChain('select');
    vi.mocked(allpeepDb).mockResolvedValue({ db: chain as never } as never);

    const profileId = await findProfileByCalendarFeedToken('some-token');

    expect(profileId).toBeNull();
    const query = renderWhere();
    // The expiry filter must be part of the live predicate, with the current
    // timestamp as its bound — if it were dropped (or inverted to `lt`) the
    // gate above never fires and expired tokens keep resolving.
    expect(query.sql).toContain('"calendar_feed_tokens"."expires_at" > $2');
    expect(query.params[1]).toBe('2026-11-20T00:00:00.000Z');
    // The lookup is by sha256 hash, not the raw token.
    expect(query.params[0]).toBe(hashToken('some-token'));
    expect(api).toHaveBeenCalledTimes(1);
  });

  it('resolves the profile id for a token whose expiry is in the future', async () => {
    fakeDbState.rows = [{ profileId: 'profile-42' }];
    const { chain } = buildChain('select');
    vi.mocked(allpeepDb).mockResolvedValue({ db: chain as never } as never);

    const profileId = await findProfileByCalendarFeedToken('active-token');

    expect(profileId).toBe('profile-42');
    const query = renderWhere();
    expect(query.sql).toContain('"calendar_feed_tokens"."expires_at" > $2');
    expect(query.params[1]).toBe('2026-11-20T00:00:00.000Z');
  });
});

describe('createCalendarFeedToken', () => {
  it('stores the sha256 hash with an expiry of now + 90 days', async () => {
    fakeDbState.rows = [{ tokenId: 'token-row-1' }];
    const { api, chain } = buildChain('insert');
    vi.mocked(allpeepDb).mockResolvedValue({ db: chain as never } as never);

    const { plainToken, tokenId } = await createCalendarFeedToken('profile-1');

    expect(tokenId).toBe('token-row-1');
    expect(plainToken).toMatch(/^[0-9a-f]{64}$/);
    expect(fakeDbState.values).toMatchObject({
      profileId: 'profile-1',
      tokenHash: hashToken(plainToken),
    });
    const expiresAt = fakeDbState.values?.expiresAt as string;
    expect(new Date(expiresAt).getTime()).toBe(
      Date.now() + 90 * 24 * 60 * 60 * 1000,
    );
    expect(api).toHaveBeenCalledTimes(1);
  });
});

describe('revokeAllCalendarFeedTokens', () => {
  it('deletes every token row for the profile (reset semantics)', async () => {
    const { api, chain } = buildChain('delete');
    vi.mocked(allpeepDb).mockResolvedValue({ db: chain as never } as never);

    const revoked = await revokeAllCalendarFeedTokens('profile-1');

    // `returning` on a delete yields the deleted rows; the module reports
    // their count as the number revoked.
    expect(revoked).toBe(0);
    const query = renderWhere();
    expect(query.sql).toContain('"calendar_feed_tokens"."profile_id" = $1');
    expect(query.params).toEqual(['profile-1']);
    expect(api).toHaveBeenCalledTimes(1);
  });
});
