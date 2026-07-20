import crypto from 'crypto';
import { SignJWT, jwtVerify, JWTPayload, KeyLike, importJWK } from 'jose';

import { config } from '../config';
import nacl, { SignKeyPair } from 'tweetnacl';

const toJWK = async (
  keyPair: SignKeyPair,
): Promise<{
  jwkPrivateKey: KeyLike | Uint8Array;
  jwkPublicKey: KeyLike | Uint8Array;
}> => {
  const encode = (uint8Array: Uint8Array) =>
    Buffer.from(uint8Array).toString('base64url');

  const jwkPublicKey = await importJWK({
    kty: 'OKP',
    crv: 'Ed25519',
    x: encode(keyPair.publicKey),
  });

  const jwkPrivateKey = await importJWK({
    kty: 'OKP',
    crv: 'Ed25519',
    d: encode(keyPair.secretKey.subarray(0, 32)), // Ed25519 private key is the first 32 bytes of the secretKey
    x: encode(keyPair.publicKey),
  });

  return { jwkPublicKey, jwkPrivateKey };
};

const initJwt = async () => {
  const {
    secrets: { jwt: jwtSecret },
  } = await config();
  const seed = crypto.createHash('sha256').update(jwtSecret).digest();

  const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));

  const { jwkPublicKey, jwkPrivateKey } = await toJWK(keyPair);
  const publicKey = Buffer.from(keyPair.publicKey).toString('base64url');

  return {
    publicKey,
    sign: ({
      payload,
      expirationTime,
      id,
    }: {
      payload: unknown;
      expirationTime: string;
      id: string;
    }) =>
      new SignJWT(payload as JWTPayload)
        .setProtectedHeader({ alg: 'EdDSA', kid: publicKey })
        .setIssuedAt()
        .setExpirationTime(expirationTime)
        .setJti(id)
        .sign(jwkPrivateKey),
    verify: async (token: string) =>
      jwtVerify(token, jwkPublicKey, { algorithms: ['EdDSA'] }).catch(
        () => undefined,
      ),
  };
};

let jwtPromise: ReturnType<typeof initJwt>;

export const jwtUtil = () => {
  if (!jwtPromise) {
    jwtPromise = initJwt();
  }
  return jwtPromise;
};
