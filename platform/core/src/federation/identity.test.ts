import { describe, expect, it } from 'vitest';
import {
  ACTOR_INBOX_PATH,
  ACTOR_PATH,
  NOTE_PATH,
  actorUri,
  federationOrigin,
  localActorScalars,
  localObjectScalars,
  objectUri,
} from './identity';
import { federatedHandleFrom } from './actors';
import { hostnameOf } from './peers';

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

  it('keeps Fedify path templates aligned with minted URIs', () => {
    expect(ACTOR_PATH).toBe('/ap/users/{identifier}');
    expect(ACTOR_INBOX_PATH).toBe('/ap/users/{identifier}/inbox');
    expect(NOTE_PATH).toBe('/ap/objects/{id}');
    expect(federationOrigin('community.example')).toBe(
      'https://community.example',
    );
  });
});

describe('federatedHandleFrom', () => {
  it('sanitizes preferred usernames and falls back to the actor URI', () => {
    expect(federatedHandleFrom('Ada Lovelace!', 'https://ex/users/1')).toBe(
      'AdaLovelace',
    );
    expect(federatedHandleFrom('', 'https://ex.example/users/ab')).toMatch(
      /^actor-[a-z0-9]+$/,
    );
  });
});

describe('hostnameOf', () => {
  it('parses hosts and rejects invalid URLs', () => {
    expect(hostnameOf('https://Mastodon.Social/users/a')).toBe(
      'mastodon.social',
    );
    expect(hostnameOf('not-a-url')).toBeNull();
  });
});
