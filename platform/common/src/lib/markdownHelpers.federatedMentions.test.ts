import { describe, expect, it } from 'vitest';
import {
  linkProfileMentions,
  matchFederatedMentionTokens,
  matchMentionHandles,
} from './markdownHelpers';

describe('matchFederatedMentionTokens', () => {
  it('extracts remote @handle@domain mentions', () => {
    const text = 'hello @user@mastodon.social and @bob@example.co, ok';
    expect(matchFederatedMentionTokens(text)).toEqual([
      'user@mastodon.social',
      'bob@example.co',
    ]);
  });

  it('supports multi-label domains', () => {
    expect(
      matchFederatedMentionTokens(
        '@u@sub.domain.example.com and @b@c.example.org',
      ),
    ).toEqual(['u@sub.domain.example.com', 'b@c.example.org']);
  });

  it('lowercases the remote token (handle and domain)', () => {
    expect(matchFederatedMentionTokens('ping @User@Mastodon.Social')).toEqual([
      'user@mastodon.social',
    ]);
  });

  it('keeps local-only mentions intact', () => {
    expect(matchFederatedMentionTokens('hi @alice end')).toEqual(['alice']);
    expect(matchMentionHandles('hi @alice end')).toEqual(['alice']);
  });

  it('does not match bare addresses or @handle-without-domain', () => {
    expect(matchFederatedMentionTokens('email user@x.com today')).toEqual([]);
    expect(matchFederatedMentionTokens('at @user@ end')).toEqual([]);
    expect(matchFederatedMentionTokens(undefined)).toEqual([]);
  });

  it('matches a parenthesised mention (a case the bare local path misses)', () => {
    // See the `federatedMentionHandleRegexBase` comment in
    // `../types/models.ts` for why the federated lookahead includes `)` while
    // the bare local regex intentionally does not match `(@a)`.
    expect(matchFederatedMentionTokens('cc (@alice@x.co) please')).toEqual([
      'alice@x.co',
    ]);
    expect(matchFederatedMentionTokens('(@bob@mastodon.social)!')).toEqual([
      'bob@mastodon.social',
    ]);
    expect(matchMentionHandles('(@alice)')).toEqual([]);
  });

  it('deduplicates repeated and case-variant tokens', () => {
    // Domains are case-insensitive, so `@a@x.co` and `@A@X.CO` are the same
    // remote actor and collapse to one token.
    expect(matchFederatedMentionTokens('@a@x.co and @A@X.CO')).toEqual([
      'a@x.co',
    ]);
    expect(matchFederatedMentionTokens('@a@x.co @b@y.org')).toEqual([
      'a@x.co',
      'b@y.org',
    ]);
  });
});

describe('linkProfileMentions with federated tokens', () => {
  it('links bare local mentions only', () => {
    expect(linkProfileMentions('hi @alice and @bob@example.social')).toBe(
      'hi [@alice](/@alice) and @bob@example.social',
    );
  });

  it('resolves known remote profiles through the mentions list', () => {
    expect(
      linkProfileMentions('hi @alice', [
        { profile: { handle: 'alice', displayName: 'Al' } },
      ]),
    ).toBe('hi [@alice](/@alice)');
    expect(
      linkProfileMentions('hi @Al', [
        { profile: { handle: 'alice', displayName: 'Al' } },
      ]),
    ).toBe('hi [@Al](/@alice)');
  });
});
