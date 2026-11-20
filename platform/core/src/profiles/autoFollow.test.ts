import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ProfileWithMeta } from '@openpeepshq/common/types';

// Real `hub` + `registeredHandlers` (the once-queue registry) so the
// test-exposed `resetAutoFollowHandlerRegistration` is exercised against the
// actual subscription map, not a stand-in.
import { hub } from '../events';
import { registeredHandlers } from '../events/once';
import { communityConfig } from '../config';
import { getProfile } from './cache';
import { followDesignatedProfiles } from './mutations';
import {
  registerAutoFollowHandler,
  resetAutoFollowHandlerRegistration,
} from './autoFollow';

vi.mock('../config', () => ({ communityConfig: vi.fn() }));
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
    vi.mocked(communityConfig).mockResolvedValue({
      content: { autoFollow: ['news'] },
    } as never);
    vi.mocked(getProfile).mockResolvedValue(newMember);

    registerAutoFollowHandler();
    const handler = registeredHandlers.get('allpeep:core:profileCreated')?.[0];
    expect(handler).toBeDefined();

    await handler!({ id: 'p1' });

    expect(followDesignatedProfiles).toHaveBeenCalledWith(newMember, ['news']);
  });

  it('skips the follow when the created profile is already gone', async () => {
    registerAutoFollowHandler();
    const handler = registeredHandlers.get('allpeep:core:profileCreated')?.[0];
    vi.mocked(getProfile).mockResolvedValue(undefined);

    await handler!({ id: 'p1' });

    expect(followDesignatedProfiles).not.toHaveBeenCalled();
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
