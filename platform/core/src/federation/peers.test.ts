import { describe, expect, it, vi } from 'vitest';

// vi.mock is hoisted above the imports, so the mutable config lives in a
// hoisted container rather than module-scope lets (TDZ when the factory runs).
const testConfig = vi.hoisted(() => ({
  allowedHosts: [] as string[],
  blockedHosts: [] as string[],
}));

vi.mock('../config', () => ({
  config: async () => ({
    federation: {
      active: true,
      allowedHosts: testConfig.allowedHosts,
      blockedHosts: testConfig.blockedHosts,
    },
  }),
}));

import { peerHostAllowed } from './peers';

describe('peerHostAllowed', () => {
  it('allows a host on the allowlist with an empty blocklist', async () => {
    testConfig.allowedHosts = ['*.example.com'];
    testConfig.blockedHosts = [];
    await expect(peerHostAllowed('https://a.example.com/@u')).resolves.toBe(
      true,
    );
  });

  it('denies a host off the allowlist', async () => {
    testConfig.allowedHosts = ['*.example.com'];
    testConfig.blockedHosts = [];
    await expect(peerHostAllowed('https://evil.example/@u')).resolves.toBe(
      false,
    );
  });

  it('denies an exact-allowed host that is on the blocklist', async () => {
    testConfig.allowedHosts = ['mastodon.social', '*.example.com'];
    testConfig.blockedHosts = ['mastodon.social'];
    await expect(peerHostAllowed('https://mastodon.social/@u')).resolves.toBe(
      false,
    );
    // A sibling host on the same allowlist is unaffected by the block.
    await expect(peerHostAllowed('https://b.example.com/@u')).resolves.toBe(
      true,
    );
  });

  it('denies a host matching a wildcard blocklist pattern', async () => {
    testConfig.allowedHosts = ['*.example.com'];
    testConfig.blockedHosts = ['*.example.com'];
    await expect(peerHostAllowed('https://a.example.com/@u')).resolves.toBe(
      false,
    );
  });
});
