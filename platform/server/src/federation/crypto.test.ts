import { generateKeyPairSync } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { importRsaPemPair } from './crypto';

describe('importRsaPemPair', () => {
  it('imports RSA PEM keys stored on local actors', async () => {
    const pem = generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    const pair = await importRsaPemPair(pem.publicKey, pem.privateKey);
    expect(pair.publicKey.type).toBe('public');
    expect(pair.privateKey.type).toBe('private');
    expect(pair.publicKey.algorithm).toMatchObject({
      name: 'RSASSA-PKCS1-v1_5',
    });
  });
});
