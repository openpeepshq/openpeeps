import { createPrivateKey, createPublicKey } from 'node:crypto';

const rsaPkcs1 = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' } as const;

export const importRsaPemPair = async (
  publicPem: string,
  privatePem: string,
): Promise<CryptoKeyPair> => {
  const publicDer = createPublicKey(publicPem).export({
    type: 'spki',
    format: 'der',
  });
  const privateDer = createPrivateKey(privatePem).export({
    type: 'pkcs8',
    format: 'der',
  });
  const publicKey = await crypto.subtle.importKey(
    'spki',
    new Uint8Array(publicDer),
    rsaPkcs1,
    true,
    ['verify'],
  );
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    new Uint8Array(privateDer),
    rsaPkcs1,
    true,
    ['sign'],
  );
  return { publicKey, privateKey };
};
