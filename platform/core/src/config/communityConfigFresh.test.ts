import { beforeEach, describe, expect, it, vi } from 'vitest';
import { communityConfigFresh, defaultCommunityConfig } from './index';

const { loadConfig } = vi.hoisted(() => ({ loadConfig: vi.fn() }));

vi.mock('./db', () => ({
  loadConfig: (...args: unknown[]) => loadConfig(...args),
}));

vi.mock('../events', () => ({
  hub: { emit: vi.fn() },
}));

vi.mock('../server/stablePublicServerInfo', () => ({
  stablePublicServerInfo: { reset: vi.fn() },
}));

describe('communityConfigFresh', () => {
  beforeEach(() => {
    loadConfig.mockReset();
  });

  it('reads the community config straight from the DB on every call, not the in-memory cache', async () => {
    // Regression for #310: the auto-follow handler runs in the worker process,
    // whose communityConfig() cache is only refreshed on a redis pub/sub
    // configUpdated event a worker connection can miss. The fresh read must
    // always hit the DB so an admin save the cache never saw is honored.
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news'] } },
    });
    const first = await communityConfigFresh();
    expect(first.content.autoFollow).toEqual(['news']);
    expect(loadConfig).toHaveBeenCalledTimes(1);
    expect(loadConfig).toHaveBeenCalledWith('openpeeps-community');

    // A later admin save lands in the DB; a second fresh read reflects it
    // instead of serving a stale cached value.
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news', 'dev'] } },
    });
    const second = await communityConfigFresh();
    expect(second.content.autoFollow).toEqual(['news', 'dev']);
    expect(loadConfig).toHaveBeenCalledTimes(2);
  });

  it('merges stored overrides onto the community defaults', async () => {
    loadConfig.mockResolvedValue({
      config: { content: { autoFollow: ['news'] } },
    });

    const result = await communityConfigFresh();

    expect(result.content.autoFollow).toEqual(['news']);
    // Un-overridden defaults survive the merge.
    expect(result.theme.base).toEqual(defaultCommunityConfig.theme.base);
    expect(result.info.name).toEqual(defaultCommunityConfig.info.name);
  });

  it('returns the community defaults when nothing is stored', async () => {
    loadConfig.mockResolvedValue(undefined);

    const result = await communityConfigFresh();

    expect(result).toEqual(defaultCommunityConfig);
    expect(result.content.autoFollow).toBeUndefined();
  });
});
