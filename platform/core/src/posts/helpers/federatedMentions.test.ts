import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { MentionWithPublicProfile } from '@openpeepshq/common/types';

const {
  findProfileByHandle: findProfileByHandleMock,
  findProfileByHandleAndDomain: findProfileByHandleAndDomainMock,
} = vi.hoisted(() => ({
  findProfileByHandle: vi.fn(),
  findProfileByHandleAndDomain: vi.fn(),
}));

vi.mock('../../profiles/finders', () => ({
  findProfileByHandle: findProfileByHandleMock,
}));
vi.mock('../../federation/profiles', () => ({
  findProfileByHandleAndDomain: findProfileByHandleAndDomainMock,
}));

const { extractFederatedMentionTokens, resolveMentionsForPost } = await import(
  './index'
);
const { federatedHandleFrom } = await import('../../federation/actors');

const noteData = (content: string) =>
  ({ type: 'note', content }) as unknown as Parameters<
    typeof resolveMentionsForPost
  >[0];

const aliceLocal = {
  id: 'local-alice',
  handle: 'alice',
  type: 'local',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as MentionWithPublicProfile['profile'];

const bobRemote = {
  id: 'remote-bob',
  handle: 'bob',
  type: 'federated',
  activityPub: { domain: 'mastodon.social' },
  uri: 'https://mastodon.social/users/bob',
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
} as unknown as MentionWithPublicProfile['profile'];

describe('extractFederatedMentionTokens', () => {
  it('returns local and remote tokens', () => {
    // Federated `handle@domain` tokens are collected before bare local
    // `@handle` tokens.
    expect(
      extractFederatedMentionTokens('hi @alice and @bob@mastodon.social!'),
    ).toEqual(['bob@mastodon.social', 'alice']);
  });
});

describe('resolveMentionsForPost with federated mentions', () => {
  beforeEach(() => {
    findProfileByHandleMock.mockReset();
    findProfileByHandleAndDomainMock.mockReset();
  });

  it('resolves a remote mention through the federated finder', async () => {
    findProfileByHandleAndDomainMock.mockResolvedValue(bobRemote);
    findProfileByHandleMock.mockResolvedValue(undefined);

    const mentions = await resolveMentionsForPost(
      noteData('shoutout @bob@mastodon.social'),
    );

    expect(findProfileByHandleAndDomainMock).toHaveBeenCalledWith(
      'bob',
      'mastodon.social',
    );
    expect(mentions).toEqual([
      { profile: bobRemote, text: '@bob@mastodon.social' },
    ]);
  });

  it('falls back to a local profile when the federated finder misses', async () => {
    findProfileByHandleAndDomainMock.mockResolvedValue(undefined);
    findProfileByHandleMock.mockResolvedValue(aliceLocal);

    const mentions = await resolveMentionsForPost(
      noteData('hey @alice@example.com'),
    );

    expect(mentions).toEqual([
      { profile: aliceLocal, text: '@alice@example.com' },
    ]);
  });

  it('keeps resolving plain local mentions by handle', async () => {
    findProfileByHandleMock.mockResolvedValue(aliceLocal);

    const mentions = await resolveMentionsForPost(noteData('hi @alice'));

    expect(findProfileByHandleAndDomainMock).not.toHaveBeenCalled();
    expect(mentions).toEqual([{ profile: aliceLocal, text: '@alice' }]);
  });

  it('resolves a remote mention whose stored handle comes from a mixed-case preferredUsername', async () => {
    // End-to-end identity-key round-trip: ingest derives the stored handle via
    // `federatedHandleFrom` (now lowercased) and mention extraction lowercases
    // the token, so both sides produce the same `('bob', 'mastodon.social')`
    // key and the exact-match `findProfileByHandleAndDomain` call hits.
    const storedHandle = federatedHandleFrom(
      'Bob',
      'https://mastodon.social/users/bob',
    );
    const bobRemoteMixedCase = {
      ...bobRemote,
      handle: storedHandle,
    };
    findProfileByHandleAndDomainMock.mockImplementation(
      async (handle: string, domain: string) =>
        handle === storedHandle && domain === 'mastodon.social'
          ? bobRemoteMixedCase
          : undefined,
    );
    findProfileByHandleMock.mockResolvedValue(undefined);

    const mentions = await resolveMentionsForPost(
      noteData('ping @Bob@Mastodon.Social'),
    );

    expect(findProfileByHandleAndDomainMock).toHaveBeenCalledWith(
      'bob',
      'mastodon.social',
    );
    expect(mentions).toEqual([
      { profile: bobRemoteMixedCase, text: '@bob@mastodon.social' },
    ]);
  });

  it('stores mention text lowercased on both branches (case-insensitive handles)', async () => {
    // The remote finder is a mock that returns bobRemote for any (handle,
    // domain); the local finder returns aliceLocal for any handle. The point
    // is the stored `text`, not which profile resolves.
    findProfileByHandleAndDomainMock.mockResolvedValue(bobRemote);
    findProfileByHandleMock.mockResolvedValue(aliceLocal);

    const mentions = await resolveMentionsForPost(
      noteData('hey @Alice and @Carol@MASTODON.SOCIAL'),
    );

    // Local `@Alice` (original case preserved at extraction) and the remote
    // `@Carol@MASTODON.SOCIAL` (domain lowercased at extraction) both store
    // their text fully lowercased, so `MentionData.text` has one shape.
    expect(mentions).toEqual([
      { profile: bobRemote, text: '@carol@mastodon.social' },
      { profile: aliceLocal, text: '@alice' },
    ]);
  });
});
