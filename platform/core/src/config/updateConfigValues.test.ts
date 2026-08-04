import { beforeEach, describe, expect, it, vi } from 'vitest';

const loadConfig = vi.fn();
const storeConfig = vi.fn();

vi.mock('./db', () => ({
  loadConfig: (...args: unknown[]) => loadConfig(...args),
  storeConfig: (...args: unknown[]) => storeConfig(...args),
}));

vi.mock('../events', () => ({
  hub: { emit: vi.fn() },
}));

describe('updateConfigValues', () => {
  beforeEach(() => {
    loadConfig.mockReset();
    storeConfig.mockReset();
    storeConfig.mockResolvedValue({ config: {} });
    vi.resetModules();
  });

  it('merges a sparse patch into existing stored overrides', async () => {
    loadConfig.mockResolvedValue({
      config: {
        theme: {
          logoSmall: 'https://example.com/logo.png',
          primaryHex: '#31b28c',
        },
        info: { name: 'Inside AllPeeP', tagLine: 'old' },
      },
    });

    const { updateConfigValues } = await import('./index');
    await updateConfigValues(
      { info: { tagLine: 'new tagline' } },
      'openpeeps',
      'community',
    );

    expect(loadConfig).toHaveBeenCalledWith('openpeeps-community');
    expect(storeConfig).toHaveBeenCalledWith('openpeeps-community', {
      config: {
        theme: {
          logoSmall: 'https://example.com/logo.png',
          primaryHex: '#31b28c',
        },
        info: { name: 'Inside AllPeeP', tagLine: 'new tagline' },
      },
    });
  });

  it('does not wipe theme when only info is patched onto an empty store', async () => {
    loadConfig.mockResolvedValue(undefined);

    const { updateConfigValues } = await import('./index');
    await updateConfigValues(
      { info: { tagLine: 'only this' } },
      'openpeeps',
      'community',
    );

    expect(storeConfig).toHaveBeenCalledWith('openpeeps-community', {
      config: { info: { tagLine: 'only this' } },
    });
  });
});
