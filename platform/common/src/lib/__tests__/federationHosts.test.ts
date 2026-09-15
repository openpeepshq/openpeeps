import { describe, expect, it } from 'vitest';
import { hostIsAllowed, hostMatchesAllowedPattern } from '../federationHosts';

describe('hostMatchesAllowedPattern', () => {
  it('matches an exact host', () => {
    expect(
      hostMatchesAllowedPattern('Mastodon.Social', 'mastodon.social'),
    ).toBe(true);
  });

  it('matches a leftmost-label wildcard', () => {
    expect(hostMatchesAllowedPattern('a.example.com', '*.example.com')).toBe(
      true,
    );
    expect(hostMatchesAllowedPattern('b.a.example.com', '*.example.com')).toBe(
      true,
    );
    expect(hostMatchesAllowedPattern('example.com', '*.example.com')).toBe(
      true,
    );
  });

  it('does not treat a bare * as allow-all', () => {
    expect(hostMatchesAllowedPattern('mastodon.social', '*')).toBe(false);
  });

  it('does not match a different host', () => {
    expect(hostMatchesAllowedPattern('evil.example', 'mastodon.social')).toBe(
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
