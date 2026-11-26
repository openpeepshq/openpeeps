import { describe, expect, it } from 'vitest';
import {
  hostFederationAllowed,
  hostIsAllowed,
  hostIsBlocked,
  hostMatchesHostPattern,
  patchTouchesFederation,
} from '../federationHosts';

describe('hostMatchesHostPattern', () => {
  it('matches an exact host', () => {
    expect(hostMatchesHostPattern('Mastodon.Social', 'mastodon.social')).toBe(
      true,
    );
  });

  it('matches a leftmost-label wildcard', () => {
    expect(hostMatchesHostPattern('a.example.com', '*.example.com')).toBe(true);
    expect(hostMatchesHostPattern('b.a.example.com', '*.example.com')).toBe(
      true,
    );
    expect(hostMatchesHostPattern('example.com', '*.example.com')).toBe(true);
  });

  it('does not treat a bare * as allow-all', () => {
    expect(hostMatchesHostPattern('mastodon.social', '*')).toBe(false);
  });

  it('does not match a different host', () => {
    expect(hostMatchesHostPattern('evil.example', 'mastodon.social')).toBe(
      false,
    );
  });
});

describe('hostIsAllowed', () => {
  it('fails closed when the allowlist is empty', () => {
    expect(hostIsAllowed('mastodon.social', [])).toBe(false);
  });

  it('matches any listed pattern', () => {
    expect(
      hostIsAllowed('foo.bar.social', ['mastodon.social', '*.bar.social']),
    ).toBe(true);
  });
});

describe('hostIsBlocked', () => {
  it('fails open when the blocklist is empty', () => {
    expect(hostIsBlocked('mastodon.social', [])).toBe(false);
  });

  it('matches a listed pattern (exact or wildcard)', () => {
    expect(hostIsBlocked('bad.example.com', ['*.example.com'])).toBe(true);
    expect(hostIsBlocked('evil.social', ['evil.social'])).toBe(true);
    expect(hostIsBlocked('good.social', ['evil.social'])).toBe(false);
  });

  it('normalizes case and a trailing dot', () => {
    expect(hostIsBlocked('Evil.Social.', ['evil.social'])).toBe(true);
  });
});

describe('hostFederationAllowed', () => {
  it('allows a host on the allowlist with an empty blocklist', () => {
    expect(
      hostFederationAllowed('mastodon.social', ['mastodon.social'], []),
    ).toBe(true);
  });

  it('denies a host off the allowlist', () => {
    expect(hostFederationAllowed('evil.social', ['mastodon.social'], [])).toBe(
      false,
    );
  });

  it('denies a host on the blocklist even when allowed (deny wins)', () => {
    expect(
      hostFederationAllowed(
        'mastodon.social',
        ['*.social'],
        ['mastodon.social'],
      ),
    ).toBe(false);
    expect(
      hostFederationAllowed(
        'a.example.com',
        ['*.example.com'],
        ['*.example.com'],
      ),
    ).toBe(false);
  });

  it('allows a wildcard-allowed host that is not blocked', () => {
    expect(
      hostFederationAllowed(
        'b.example.com',
        ['*.example.com'],
        ['a.example.com'],
      ),
    ).toBe(true);
  });
});

describe('patchTouchesFederation', () => {
  it('returns true when a sparse patch has a federation key', () => {
    expect(
      patchTouchesFederation({ federation: { blockedHosts: ['a'] } }),
    ).toBe(true);
  });

  it('returns true for an empty federation patch', () => {
    expect(patchTouchesFederation({ federation: {} })).toBe(true);
  });

  it('returns false for patches without a federation key', () => {
    expect(patchTouchesFederation({ info: { tagLine: 'x' } })).toBe(false);
    expect(patchTouchesFederation({})).toBe(false);
  });

  it('returns false for non-object input', () => {
    expect(patchTouchesFederation(null)).toBe(false);
    expect(patchTouchesFederation(undefined)).toBe(false);
    expect(patchTouchesFederation('federation')).toBe(false);
  });
});
