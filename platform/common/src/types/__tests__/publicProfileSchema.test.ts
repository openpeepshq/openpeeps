import { describe, expect, it } from 'vitest';
import { publicPostSchema, publicProfileSchema } from '../api';
import { profileWithMetaSchema } from '../internal';

const baseProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'local' as const,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
  handle: 'johndoe',
  displayName: 'John Doe',
};

describe('publicProfileSchema roles', () => {
  it('keeps role identity and strips capabilities', () => {
    const result = publicProfileSchema.parse({
      ...baseProfile,
      roles: [
        {
          key: 'owner',
          displayName: 'Owner',
          default: true,
          capabilities: { add: ['*'], remove: [] },
          description: 'The owner of this community can do everything',
        },
      ],
    });

    expect(result.roles).toEqual([{ key: 'owner', displayName: 'Owner' }]);
  });

  it('allows profiles without roles', () => {
    const result = publicProfileSchema.parse(baseProfile);
    expect(result.roles).toBeUndefined();
  });

  it('strips actor/key columns from public profile JSON', () => {
    const result = publicProfileSchema.parse({
      ...baseProfile,
      uri: 'https://example.com/ap/users/a',
      inboxUrl: 'https://example.com/ap/users/a/inbox',
      sharedInboxUrl: 'https://example.com/ap/inbox',
      publicKeyPem: 'PUBLIC',
      privateKeyPem: 'SECRET',
      keyId: 'https://example.com/ap/users/a#main-key',
      fetchedAt: '2026-01-01T00:00:00.000Z',
    });
    expect(result).not.toHaveProperty('uri');
    expect(result).not.toHaveProperty('inboxUrl');
    expect(result).not.toHaveProperty('privateKeyPem');
    expect(result).not.toHaveProperty('publicKeyPem');
    expect(result).not.toHaveProperty('keyId');
  });
});

describe('profileWithMetaSchema', () => {
  it('strips actor/key columns from current-profile JSON', () => {
    const result = profileWithMetaSchema.parse({
      ...baseProfile,
      roles: [],
      followers: [],
      following: [],
      controllers: [],
      memberships: [],
      profileStats: { followersCount: 0, followingCount: 0 },
      uri: 'https://example.com/ap/users/a',
      privateKeyPem: 'SECRET',
      publicKeyPem: 'PUBLIC',
    });
    expect(result).not.toHaveProperty('uri');
    expect(result).not.toHaveProperty('privateKeyPem');
    expect(result).not.toHaveProperty('publicKeyPem');
  });
});

describe('publicPostSchema', () => {
  it('strips object URI columns from public post JSON', () => {
    const result = publicPostSchema.parse({
      id: '33333333-3333-4333-8333-333333333333',
      type: 'note',
      profile: baseProfile,
      data: { type: 'note', content: 'hello' },
      entries: [],
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      visibility: 'public',
      repostCount: 0,
      replyCount: 0,
      reactions: [],
      reposts: [],
      mentions: [],
      tags: [],
      rsvps: [],
      uri: 'https://example.com/ap/objects/post',
      inReplyToUri: 'https://example.com/ap/objects/parent',
    });
    expect(result).not.toHaveProperty('uri');
    expect(result).not.toHaveProperty('inReplyToUri');
  });
});
