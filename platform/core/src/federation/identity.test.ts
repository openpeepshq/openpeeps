import { describe, expect, it } from 'vitest';
import {
  actorUri,
  localActorScalars,
  localObjectScalars,
  objectUri,
} from './identity';

describe('federation identity URLs', () => {
  it('mints stable actor and object URIs', () => {
    expect(actorUri('community.example', 'abc')).toBe(
      'https://community.example/ap/users/abc',
    );
    expect(objectUri('community.example', 'post-1')).toBe(
      'https://community.example/ap/objects/post-1',
    );
  });

  it('stores local actor inbox and keys without a shared inbox', () => {
    const actor = localActorScalars('abc', 'community.example');
    expect(actor.uri).toBe('https://community.example/ap/users/abc');
    expect(actor.inboxUrl).toBe('https://community.example/ap/users/abc/inbox');
    expect(actor.keyId).toBe('https://community.example/ap/users/abc#main-key');
    expect(actor.publicKeyPem).toContain('BEGIN PUBLIC KEY');
    expect(actor.privateKeyPem).toContain('BEGIN PRIVATE KEY');
    expect(actor).not.toHaveProperty('sharedInboxUrl');
  });

  it('mints object URIs and optional inReplyToUri', () => {
    expect(localObjectScalars('post-1', 'community.example')).toEqual({
      uri: 'https://community.example/ap/objects/post-1',
      inReplyToUri: null,
    });
    expect(localObjectScalars('post-2', 'community.example', 'post-1')).toEqual(
      {
        uri: 'https://community.example/ap/objects/post-2',
        inReplyToUri: 'https://community.example/ap/objects/post-1',
      },
    );
  });
});
