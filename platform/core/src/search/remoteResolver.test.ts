import { beforeEach, describe, expect, it, vi } from 'vitest';

const state = vi.hoisted(() => ({
  hostAllowed: true,
  existing: undefined as
    | { id: string; handle: string; activityPub?: { domain: string } }
    | undefined,
  fetched: undefined as
    | {
        uri: string;
        handle: string;
        domain: string;
        displayName?: string;
        bio?: string;
      }
    | undefined,
  fetchCalls: 0,
  upserted: null as unknown,
  fetchError: undefined as unknown,
}));

vi.mock('../federation/peers', () => ({
  peerHostAllowed: async () => state.hostAllowed,
}));

vi.mock('../federation/profiles', () => ({
  findProfileByHandleAndDomain: async () => state.existing,
}));

vi.mock('../federation/actors', () => ({
  upsertRemoteActor: async (input: unknown) => {
    state.upserted = input;
    return (state.existing ?? {
      id: 'remote-1',
      handle: (input as { handle: string }).handle,
    }) as never;
  },
}));

import {
  isRemoteIdentityQuery,
  parseRemoteIdentity,
  resolveRemoteIdentity,
} from './remoteResolver';

beforeEach(() => {
  state.hostAllowed = true;
  state.existing = undefined;
  state.fetched = undefined;
  state.fetchCalls = 0;
  state.upserted = null;
  state.fetchError = undefined;
});

describe('parseRemoteIdentity', () => {
  it('parses an @handle@domain query', () => {
    expect(parseRemoteIdentity('@alice@mastodon.social')).toEqual({
      handle: 'alice',
      domain: 'mastodon.social',
    });
  });

  it('parses a bare handle@domain query without a leading @', () => {
    expect(parseRemoteIdentity('alice@mastodon.social')).toEqual({
      handle: 'alice',
      domain: 'mastodon.social',
    });
  });

  it('parses a profile URL', () => {
    expect(parseRemoteIdentity('https://mastodon.social/@alice')).toEqual({
      handle: 'alice',
      domain: 'mastodon.social',
    });
    expect(parseRemoteIdentity('https://mastodon.social/alice')).toEqual({
      handle: 'alice',
      domain: 'mastodon.social',
    });
  });

  it('lowercases and strips a trailing dot from the domain', () => {
    expect(parseRemoteIdentity('@alice@MASTODON.social.')).toEqual({
      handle: 'alice',
      domain: 'mastodon.social',
    });
  });

  it('treats a local @handle as not remote', () => {
    expect(parseRemoteIdentity('@alice')).toBeNull();
  });

  it('preserves handle casing while normalizing only the domain (docstring contract)', () => {
    // The docstring promises handles are preserved exactly as typed (no
    // lowercasing); only the domain is normalized. A silent regression to
    // lowercasing would break the `findProfileByHandleAndDomain` fast-paths
    // for mixed-case servers/handles, so pin the contract.
    expect(parseRemoteIdentity('@Alice@Mastodon.Social')).toEqual({
      handle: 'Alice',
      domain: 'mastodon.social',
    });
  });

  it('rejects a profile URL whose handle segment is empty or @-only', () => {
    // `https://host/@` parses fine as a URL and its last path segment is
    // `@`; without the empty-handle guard this would WebFinger
    // `acct:@host` and only fail at the fetch. Mirrors the `@`-form's
    // `if (!handle) return null` check.
    expect(parseRemoteIdentity('https://mastodon.social/@')).toBeNull();
    expect(parseRemoteIdentity('https://mastodon.social/')).toBeNull();
  });

  it('treats free text and whitespace as not remote', () => {
    expect(parseRemoteIdentity('alice bob')).toBeNull();
    expect(parseRemoteIdentity('')).toBeNull();
    expect(parseRemoteIdentity('hello world @x.co')).toBeNull();
  });
});

describe('isRemoteIdentityQuery', () => {
  it('detects remote-looking queries only', () => {
    expect(isRemoteIdentityQuery('@alice@mastodon.social')).toBe(true);
    expect(isRemoteIdentityQuery('https://x.co/@a')).toBe(true);
    expect(isRemoteIdentityQuery('@alice')).toBe(false);
    expect(isRemoteIdentityQuery('bob')).toBe(false);
  });
});

describe('resolveRemoteIdentity', () => {
  it('resolves local queries without any fetch', async () => {
    const fetcher = vi.fn(async () => {
      state.fetchCalls += 1;
      return state.fetched;
    });
    const result = await resolveRemoteIdentity('@alice', fetcher);
    expect(result).toBeUndefined();
    expect(state.fetchCalls).toBe(0);
  });

  it('returns the existing profile without fetching when already ingested', async () => {
    state.existing = {
      id: 'remote-1',
      handle: 'alice',
      activityPub: { domain: 'mastodon.social' },
    };
    const fetcher = vi.fn(async () => {
      state.fetchCalls += 1;
      return state.fetched;
    });
    const result = await resolveRemoteIdentity(
      '@alice@mastodon.social',
      fetcher,
    );
    expect(result).toEqual(state.existing);
    expect(state.fetchCalls).toBe(0);
  });

  it('fetches and upserts an unknown remote identity', async () => {
    state.existing = undefined;
    state.fetched = {
      uri: 'https://mastodon.social/users/alice',
      handle: 'alice',
      domain: 'mastodon.social',
      displayName: 'Alice',
    };
    const fetcher = vi.fn(async () => {
      state.fetchCalls += 1;
      return state.fetched;
    });
    const result = (await resolveRemoteIdentity(
      '@alice@mastodon.social',
      fetcher,
    )) as { id: string; handle: string };
    expect(state.fetchCalls).toBe(1);
    expect(state.upserted).toMatchObject({
      uri: 'https://mastodon.social/users/alice',
      handle: 'alice',
      domain: 'mastodon.social',
      displayName: 'Alice',
    });
    expect(result.handle).toBe('alice');
  });

  it('denies a blocked host without fetching', async () => {
    state.hostAllowed = false;
    const fetcher = vi.fn(async () => {
      state.fetchCalls += 1;
      return state.fetched;
    });
    const result = await resolveRemoteIdentity(
      '@alice@blocked.example',
      fetcher,
    );
    expect(result).toBeUndefined();
    expect(state.fetchCalls).toBe(0);
    state.hostAllowed = true;
  });

  it('resolves undefined when the fetch fails', async () => {
    state.existing = undefined;
    state.fetchError = new Error('network down');
    const fetcher = vi.fn(async () => {
      state.fetchCalls += 1;
      throw state.fetchError;
    });
    const result = await resolveRemoteIdentity(
      '@alice@mastodon.social',
      fetcher,
    );
    expect(result).toBeUndefined();
    expect(state.fetchCalls).toBe(1);
  });
});
