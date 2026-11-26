/**
 * Regression test for the `/server/info` community-config lenient path
 * (issue #276, round-8 review item #10) — the serverInfo analogue of
 * `config/communityConfigBypass.test.ts`.
 *
 * `serverInfo()` renders `communityConfig()` into the public `/server/info`
 * payload. `communityConfig()` loads the stored community document through
 * `zodDeepPartialSchema` (a lenient deep-partial), not the strict
 * `communityConfigSchema`. That is load-bearing: a community whose stored
 * document predates a later-added schema key (e.g. the required `roles` key)
 * must still serve `/server/info` instead of 500-ing. A regression to strict
 * parsing at the read path would break every such community.
 *
 * Only the external boundaries are mocked (config DB, the process-wide event
 * hub, and the DB-backed / OS-backed `serverInfo` reads — `postSeen`,
 * `diskUsage`). The real `config()` / `communityConfig()` loader — including
 * `zodDeepPartialSchema` — and the real `serverInfo` shape-building run.
 */
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { communityConfigSchema } from '@openpeepshq/common/types';
import { defaultConfig } from '../config/defaults/core';
import { defaultCommunityConfig } from '../config/defaults/community';

const { loadConfig, storeConfig, hub, database, diskUsage } = vi.hoisted(
  () => ({
    loadConfig: vi.fn(),
    storeConfig: vi.fn(),
    hub: { emit: vi.fn() },
    database: vi.fn(),
    diskUsage: vi.fn(),
  }),
);

// External config DB + the process-wide event hub (both touched by the real
// config loader). The real initConfig → zodDeepPartialSchema path runs.
vi.mock('../config/db', () => ({
  loadConfig: (...args: unknown[]) => loadConfig(...args),
  storeConfig: (...args: unknown[]) => storeConfig(...args),
}));
vi.mock('../events', () => ({ hub }));
// The DB-backed postSeen read and the OS-backed media-folder/disk read are
// not the subject of this test.
vi.mock('../db', () => ({
  database: (...args: unknown[]) => database(...args),
}));
vi.mock('./status', async (importOriginal) => ({
  ...((await importOriginal()) as object),
  diskUsage,
}));

const { serverInfo } = await import('./index');

/**
 * A stored community document that predates the required `roles` key (added
 * to the schema after this community's last config write) and carries an
 * unknown legacy `content` key. The strict schema rejects it; the
 * deep-partial loader tolerates both and drops/merges them.
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

describe('serverInfo community-config lenient path', () => {
  beforeEach(() => {
    loadConfig.mockReset();
    storeConfig.mockReset();
    database.mockReset();
    diskUsage.mockReset();
    // Core + community keys resolve to the same stored document by key; the
    // core one is unused (defaults apply) but stubbed so the real loader
    // never touches the DB.
    loadConfig.mockImplementation((key: string) =>
      key === 'openpeeps-community'
        ? Promise.resolve({ config: legacyStoredDoc })
        : Promise.resolve(undefined),
    );
    database.mockResolvedValue({ select: () => ({ from: () => ({}) }) });
    diskUsage.mockResolvedValue(null);
  });

  it('the stored community document fails the strict schema', () => {
    // A regression to strict parsing at the read path would 500 /server/info:
    // prove the stored document does not satisfy communityConfigSchema.
    expect(() => communityConfigSchema.parse(legacyStoredDoc)).toThrow();
  });

  it('serves a pre-schema-addition community, with defaults merged', async () => {
    const info = await serverInfo();
    // The community's configured reaction set survives the lenient merge.
    expect(info.communityConfig.content?.allowedReactions).toEqual(['🐰']);
    // The unknown legacy content key is stripped by the deep-partial.
    expect('legacyKey' in (info.communityConfig.content ?? {})).toBe(false);
    // The missing required `roles` key falls back to the registered default.
    expect(info.communityConfig.roles).toEqual(defaultCommunityConfig.roles);
    // The rest of the public payload still satisfies the schema and carries
    // core defaults (proving the whole shape built without a DB).
    expect(info.version).toBe(defaultConfig.version);
    expect(info.jams.livekit.url).toBe(defaultConfig.jams.livekit.url);
    expect(info.lastAccessed).toBeNull();
    // Federation status surfaces from the (default, inactive) core config —
    // the welcome page's "Federated" line reads this public payload field.
    expect(info.federation).toEqual({
      active: defaultConfig.federation.active,
    });
  });
});
