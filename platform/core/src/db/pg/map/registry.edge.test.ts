import { describe, expect, it } from 'vitest';
import { rowToDocument } from './registry';

describe('rowToDocument for edges', () => {
  it('prefers the row primary key over a stale body.id', () => {
    const doc = rowToDocument(
      'jamRecordings',
      {
        id: 'row-id',
        fromId: 'profile-1',
        toId: 'post-1',
        body: { id: 'stale-body-id', status: 'active' },
        createdAt: '2026-08-05T00:00:00.000Z',
        updatedAt: '2026-08-05T00:00:01.000Z',
      },
      true,
    );

    expect(doc.id).toBe('row-id');
    expect(doc.status).toBe('active');
    expect(doc._from).toBe('profiles/profile-1');
    expect(doc._to).toBe('posts/post-1');
  });
});

describe('rowToDocument for profiles', () => {
  it('maps actor scalar columns and omits the private key', () => {
    const doc = rowToDocument('profiles', {
      id: 'profile-1',
      handle: 'alice',
      type: 'local',
      activityPubDomain: 'example.com',
      uri: 'https://example.com/ap/users/profile-1',
      inboxUrl: 'https://example.com/ap/users/profile-1/inbox',
      sharedInboxUrl: 'https://example.com/ap/inbox',
      publicKeyPem: 'PUBLIC',
      privateKeyPem: 'SECRET',
      keyId: 'https://example.com/ap/users/profile-1#main-key',
      fetchedAt: '2026-01-01T00:00:00.000Z',
      body: { displayName: 'Alice' },
      createdAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:01.000Z',
    });

    expect(doc).toMatchObject({
      id: 'profile-1',
      handle: 'alice',
      type: 'local',
      displayName: 'Alice',
      uri: 'https://example.com/ap/users/profile-1',
      inboxUrl: 'https://example.com/ap/users/profile-1/inbox',
      publicKeyPem: 'PUBLIC',
      keyId: 'https://example.com/ap/users/profile-1#main-key',
      activityPub: { domain: 'example.com' },
    });
    expect(doc).not.toHaveProperty('privateKeyPem');
  });
});
