import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

// Real `hub` + `registeredHandlers` (the once-queue registry) so the
// test-exposed `resetAutoFollowHandlerRegistration` is exercised against the
// actual subscription map, not a stand-in.
import { hub } from '../events';
import { registeredHandlers } from '../events/once';
// The real config module: the #310 regression test must seed the real
// in-memory cache (configPromises) and observe the handler's DB hits, so a
// regression to the cached communityConfig()/config() read is a visible
// failure rather than a stand-in assertion.
import { communityConfig } from '../config';
import { getProfile } from './cache';
import { followDesignatedProfiles } from './mutations';
import {
  registerAutoFollowHandler,
  resetAutoFollowHandlerRegistration,
} from './autoFollow';

const { loadConfig, logError } = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  logError: vi.fn(),
}));

vi.mock('../config/db', () => ({
  loadConfig: (...args: unknown[]) => loadConfig(...args),
  storeConfig: vi.fn(),
}));
vi.mock('../server/stablePublicServerInfo', () => ({
  stablePublicServerInfo: { reset: vi.fn() },
}));
vi.mock('../log', () => ({
  logger: () => ({
    error: logError,
    info: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
    fatal: vi.fn(),
    trace: vi.fn(),
  }),
}));
vi.mock('./cache', () => ({ getProfile: vi.fn() }));
vi.mock('./mutations', () => ({ followDesignatedProfiles: vi.fn() }));

const newMember = {
  id: 'p1',
  handle: 'member',
  roles: [],
  followers: [],
  following: [],
  blockingIds: [],
  blockedByIds: [],
} as ProfileWithMeta;

describe('registerAutoFollowHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadConfig.mockResolvedValue(undefined);
    // The `registered` flag is module state shared across tests in this file:
    // clear it (and the once-queue registry) so each test starts with a clean
    // slate and re-subscribes.
    resetAutoFollowHandlerRegistration();
    registeredHandlers.clear();
  });

  afterEach(() => {
    // The hub + registry are module state shared across test files in this
    // worker; leave a clean slate for the next suite.
    resetAutoFollowHandlerRegistration();
    registeredHandlers.clear();
  });

  it('subscribes the designated-follow handler to profileCreated and runs it', async () => {
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news'] } },
    });
    vi.mocked(getProfile).mockResolvedValue(newMember);

    registerAutoFollowHandler();
    const handler = registeredHandlers.get('allpeep:core:profileCreated')?.[0];
    expect(handler).toBeDefined();

    await handler!({ id: 'p1' });

    expect(followDesignatedProfiles).toHaveBeenCalledWith(newMember, ['news']);
  });

  it('reads the community config fresh, never through the in-memory cache', async () => {
    // Regression for #310: the handler runs in the worker process, whose
    // communityConfig() cache is only refreshed on a redis pub/sub
    // `configUpdated` event a worker connection can miss. It must read the
    // DB on every run so an admin save the worker's cache never saw is still
    // honored.
    //
    // Seed the real in-memory cache with a stale community value (the state
    // the worker's cache holds when it missed the pub/sub event)...
    loadConfig.mockResolvedValue({ config: { content: {} } });
    await communityConfig();
    expect(loadConfig).toHaveBeenCalledTimes(1);
    // ...then an admin save lands in the DB. A handler that read through the
    // cached communityConfig()/config() promise would follow the stale value;
    // the fresh read follows the stored one.
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news'] } },
    });
    vi.mocked(getProfile).mockResolvedValue(newMember);

    registerAutoFollowHandler();
    const handler = registeredHandlers.get('allpeep:core:profileCreated')?.[0];
    expect(handler).toBeDefined();

    await handler!({ id: 'p1' });

    // A DB hit for the run: the fresh read re-reads rather than serving the
    // seeded cached promise.
    expect(loadConfig).toHaveBeenCalledTimes(2);
    expect(followDesignatedProfiles).toHaveBeenCalledWith(newMember, ['news']);

    // A second member still gets the current DB value, not a copy of the
    // first read (no handler-level memoization either).
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news', 'dev'] } },
    });
    await handler!({ id: 'p1' });
    expect(loadConfig).toHaveBeenCalledTimes(3);
    expect(followDesignatedProfiles).toHaveBeenLastCalledWith(newMember, [
      'news',
      'dev',
    ]);
  });

  it('skips the follow when the created profile is already gone', async () => {
    registerAutoFollowHandler();
    const handler = registeredHandlers.get('allpeep:core:profileCreated')?.[0];
    vi.mocked(getProfile).mockResolvedValue(undefined);

    await handler!({ id: 'p1' });

    expect(followDesignatedProfiles).not.toHaveBeenCalled();
  });

  it('propagates a config read failure to the once queue and logs the profile id', async () => {
    // Failure contract: the catch re-throws so the once-queue job fails and
    // stays retained for diagnosis (removeOnFail age in events/once.ts; the
    // queue sets no attempts, so no retry is scheduled) — and the
    // handler-level log line is what makes the failed profile identifiable.
    loadConfig.mockRejectedValue(new Error('db down'));
    vi.mocked(getProfile).mockResolvedValue(newMember);

    registerAutoFollowHandler();
    const handler = registeredHandlers.get('allpeep:core:profileCreated')?.[0];
    expect(handler).toBeDefined();

    await expect(handler!({ id: 'p1' })).rejects.toThrow('db down');

    expect(logError).toHaveBeenCalledWith(
      'auto-follow handler failed for profile p1',
      expect.any(Error),
    );
    expect(followDesignatedProfiles).not.toHaveBeenCalled();
  });

  it('propagates a follow failure to the once queue and logs the profile id', async () => {
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news'] } },
    });
    vi.mocked(getProfile).mockResolvedValue(newMember);
    vi.mocked(followDesignatedProfiles).mockRejectedValueOnce(
      new Error('follow boom'),
    );

    registerAutoFollowHandler();
    const handler = registeredHandlers.get('allpeep:core:profileCreated')?.[0];
    expect(handler).toBeDefined();

    await expect(handler!({ id: 'p1' })).rejects.toThrow('follow boom');

    expect(logError).toHaveBeenCalledWith(
      'auto-follow handler failed for profile p1',
      expect.any(Error),
    );
    expect(followDesignatedProfiles).toHaveBeenCalledTimes(1);
  });

  it('resets the module-local registration so a second call re-subscribes', () => {
    expect(hub.once).toBeDefined();
    registerAutoFollowHandler();
    expect(registeredHandlers.get('allpeep:core:profileCreated')).toHaveLength(
      1,
    );

    // Guarded: the second call does not re-subscribe on its own.
    registerAutoFollowHandler();
    expect(registeredHandlers.get('allpeep:core:profileCreated')).toHaveLength(
      1,
    );

    resetAutoFollowHandlerRegistration();
    registerAutoFollowHandler();
    expect(registeredHandlers.get('allpeep:core:profileCreated')).toHaveLength(
      2,
    );
  });
});
