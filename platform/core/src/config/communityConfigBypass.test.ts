/**
 * Regression test for the `/server/info` community-config schema bypass
 * (issue #276, round-5 review item #3).
 *
 * `communityConfig()` loads the stored config document through
 * `zodDeepPartialSchema` — a lenient deep-partial — not the strict
 * `communityConfigSchema`. That is load-bearing: `/server/info` (and every
 * `communityConfig()` reader, including the orphan-reaction path) must serve a
 * community whose stored document predates a later-added schema key. A
 * regression to strict parsing would make such a community 500 on
 * `/server/info` instead of falling back to the defaults.
 *
 * This pins the bypass: a stored document that FAILS the strict schema still
 * loads through the real config loader, with the offending key dropped and the
 * defaults merged in.
 *
 * Only the config DB and the process-wide side effects are mocked; the real
 * `initConfig` → `zodDeepPartialSchema` path runs.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { communityConfigSchema } from '@openpeepshq/common/types';
import { communityConfig } from './index';

const { loadConfig, storeConfig } = vi.hoisted(() => ({
  loadConfig: vi.fn(),
  storeConfig: vi.fn(),
}));

vi.mock('./db', () => ({
  loadConfig: (...args: unknown[]) => loadConfig(...args),
  storeConfig: (...args: unknown[]) => storeConfig(...args),
}));
vi.mock('../events', () => ({
  hub: { emit: vi.fn() },
}));
vi.mock('../server/stablePublicServerInfo', () => ({
  stablePublicServerInfo: { reset: vi.fn(), get: (fn: () => unknown) => fn() },
}));

/**
 * A stored community document that predates the required `roles` key (added to
 * the schema after this community's last config write) and carries an unknown
 * legacy `content` key. The strict schema rejects it; the deep-partial loader
 * tolerates both and drops them.
 */
const legacyStoredDoc = {
  theme: {
    base: 'OpenpeepsLight',
    light: { primaryHex: '#15678a' },
    dark: { primaryHex: '#38aee1' },
  },
  info: { name: 'n', tagLine: 't' },
  content: { allowedReactions: ['🐰'], legacyKey: 'old' },
  settings: { openRegistrations: true },
};

describe('communityConfig deep-partial bypass', () => {
  beforeEach(() => {
    loadConfig.mockReset();
    storeConfig.mockReset();
    loadConfig.mockResolvedValue({ config: legacyStoredDoc });
  });

  it('fails the strict schema', () => {
    // A regression to strict parsing at the read path would 500 /server/info:
    // prove the stored document does not satisfy communityConfigSchema.
    expect(() => communityConfigSchema.parse(legacyStoredDoc)).toThrow();
  });

  it('still loads through the config loader, dropping unknown/missing keys', async () => {
    const config = await communityConfig();
    // The community's configured reaction set survives the merge.
    expect(config.content?.allowedReactions).toEqual(['🐰']);
    // The unknown legacy content key is stripped by the deep-partial.
    expect('legacyKey' in (config.content ?? {})).toBe(false);
    // The missing required `roles` key falls back to the registered default.
    expect(config.roles).toBeDefined();
  });
});
