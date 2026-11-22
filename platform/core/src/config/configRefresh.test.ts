import { beforeEach, describe, expect, it, vi } from 'vitest';
import { communityConfig, refreshConfig, updateConfigValues } from './index';

const { loadConfig, storeConfig, hubEmit } = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  storeConfig: vi.fn(),
  hubEmit: vi.fn(),
}));

vi.mock('./db', () => ({
  loadConfig: (...args: unknown[]) => loadConfig(...args),
  storeConfig: (...args: unknown[]) => storeConfig(...args),
}));

vi.mock('../events', () => ({
  hub: { emit: hubEmit },
}));

vi.mock('../server/stablePublicServerInfo', () => ({
  stablePublicServerInfo: { reset: vi.fn() },
}));

// Root of the #310 worker refresh path: the worker's `configUpdated` listener
// calls refreshConfig, and only by dropping the cached promise does the next
// communityConfig() read reflect a fresh DB value. The save-side test pins the
// event that triggers it, so the save→emit→refresh chain is covered end to
// end. configPromises is process-wide, so each test re-seeds the community
// entry with its own mock.
describe('refreshConfig', () => {
  beforeEach(() => {
    loadConfig.mockReset();
    storeConfig.mockReset();
    hubEmit.mockReset();
  });

  it('holds the cached value until a refresh forces a fresh DB read', async () => {
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news'] } },
    });
    refreshConfig('openpeeps', 'community');
    const first = await communityConfig();
    expect(first.content.autoFollow).toEqual(['news']);
    loadConfig.mockClear();

    // A new admin save lands in the DB...
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news', 'dev'] } },
    });
    // ...but the cached promise keeps serving the stale value and never
    // re-reads on its own.
    const cached = await communityConfig();
    expect(cached.content.autoFollow).toEqual(['news']);
    expect(loadConfig).not.toHaveBeenCalled();

    // refreshConfig drops the cached promise, so the next read hits the DB.
    refreshConfig('openpeeps', 'community');
    const reloaded = await communityConfig();
    expect(reloaded.content.autoFollow).toEqual(['news', 'dev']);
  });

  it('scopes the invalidation to the refreshed namespace/name pair', async () => {
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news'] } },
    });
    refreshConfig('openpeeps', 'community');
    const first = await communityConfig();
    expect(first.content.autoFollow).toEqual(['news']);

    // A core refresh must not drop the cached community promise.
    refreshConfig('openpeeps', 'core');
    const stillCached = await communityConfig();
    expect(stillCached.content.autoFollow).toEqual(['news']);

    // The community key was read exactly once (the initial community refresh);
    // the core refresh did not cause a community re-read.
    const communityReads = loadConfig.mock.calls.filter(
      (call) => call[0] === 'openpeeps-community',
    );
    expect(communityReads).toHaveLength(1);
  });
});

describe('updateConfigValues — save side of the configUpdated chain', () => {
  beforeEach(() => {
    loadConfig.mockReset();
    storeConfig.mockReset();
    hubEmit.mockReset();
  });

  it('persists the merge and emits configUpdated for the refreshed namespace/name pair', async () => {
    // Save→emit→refresh is the worker's recovery chain for a missed pub/sub
    // event (see communityConfigFresh): this pins the save-side emit the
    // refreshConfig tests above only consume, so the chain is covered end to
    // end.
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news'] } },
    });
    storeConfig.mockResolvedValue(undefined);

    await updateConfigValues(
      { content: { autoFollow: ['news', 'dev'] } },
      'openpeeps',
      'community',
    );

    // The sparse patch is merged into the stored overrides before the write.
    expect(storeConfig).toHaveBeenCalledTimes(1);
    expect(storeConfig.mock.calls[0][0]).toBe('openpeeps-community');
    expect(storeConfig.mock.calls[0][1]).toEqual({
      config: { content: { autoFollow: ['news', 'dev'] } },
    });
    // The event the worker's refreshConfig listener subscribes to fires for
    // the same pair the cache entry was refreshed under.
    expect(hubEmit).toHaveBeenCalledWith(
      'configUpdated',
      'openpeeps',
      'community',
    );
  });
});
