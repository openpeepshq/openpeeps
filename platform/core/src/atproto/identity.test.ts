import { describe, expect, it } from 'vitest';
import {
  atHandleFor,
  atprotoJwtSeed,
  atprotoOrigin,
  handleWellKnownUrl,
  isPublicHandleDomain,
  buildDidDocument,
  buildInstanceDidDocument,
  didDocumentPath,
  didWebForHandle,
  handleFromAtHandle,
  instanceDidWeb,
  sanitizeAtHandleLabel,
} from './identity';

describe('atproto identity', () => {
  it('mints instance-bound did:web and handle', () => {
    expect(didWebForHandle('community.example', 'Alice!')).toBe(
      'did:web:community.example:atproto:users:alice',
    );
    expect(atHandleFor('Alice!', 'community.example')).toBe(
      'alice.community.example',
    );
    expect(didDocumentPath('Alice!')).toBe('/atproto/users/alice/did.json');
    expect(atprotoOrigin('community.example')).toBe(
      'https://community.example',
    );
  });

  it('parses handle labels from at-handles', () => {
    expect(
      handleFromAtHandle('alice.community.example', 'community.example'),
    ).toBe('alice');
    expect(handleFromAtHandle('alice.other.example', 'community.example')).toBe(
      null,
    );
    expect(isPublicHandleDomain('community.example')).toBe(true);
    expect(isPublicHandleDomain('localhost')).toBe(false);
    expect(handleWellKnownUrl('alice.community.example')).toBe(
      'https://alice.community.example/.well-known/atproto-did',
    );
  });

  it('builds DID documents with a PDS service', () => {
    const doc = buildDidDocument({
      did: 'did:web:community.example:atproto:users:alice',
      handle: 'alice',
      domain: 'community.example',
      publicKeyDid: 'did:key:zPublic',
    });
    expect(doc.id).toBe('did:web:community.example:atproto:users:alice');
    expect(doc.service[0]?.type).toBe('AtprotoPersonalDataServer');
    expect(doc.verificationMethod[0]?.publicKeyMultibase).toBe('zPublic');
    expect(instanceDidWeb('community.example')).toBe(
      'did:web:community.example',
    );
    expect(buildInstanceDidDocument('community.example').id).toBe(
      'did:web:community.example',
    );
  });

  it('uses a distinct seed from the community JWT secret', () => {
    const a = atprotoJwtSeed('secret');
    const b = atprotoJwtSeed('secret');
    const c = atprotoJwtSeed('other');
    expect(a.equals(b)).toBe(true);
    expect(a.equals(c)).toBe(false);
  });

  it('falls back when a handle has no legal label characters', () => {
    expect(sanitizeAtHandleLabel('!!!')).toBe('user');
  });
});
