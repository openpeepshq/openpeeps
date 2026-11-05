import crypto from 'node:crypto';
import { SignJWT, jwtVerify, importJWK, type JWTPayload } from 'jose';
import nacl from 'tweetnacl';
import { uuidv7 } from 'uuidv7';
import { config } from '../config';
import { atprotoJwtSeed } from './identity';

export const ATPROTO_TOKEN_AUD = 'atproto';
export const ATPROTO_TOKEN_TYP = 'at+jwt';
export const ATPROTO_ACCESS_SCOPE = 'com.atproto.access';
export const ATPROTO_SESSION_EXP = '2h';
export const ATPROTO_REFRESH_EXP = '90d';

type AtprotoJwt = {
  sign: (input: {
    payload: JWTPayload;
    expirationTime: string;
    typ?: string;
  }) => Promise<string>;
  verify: (token: string) => Promise<JWTPayload | undefined>;
};

const toJwk = async (keyPair: nacl.SignKeyPair) => {
  const encode = (bytes: Uint8Array) =>
    Buffer.from(bytes).toString('base64url');
  return {
    publicKey: await importJWK({
      kty: 'OKP',
      crv: 'Ed25519',
      x: encode(keyPair.publicKey),
    }),
    privateKey: await importJWK({
      kty: 'OKP',
      crv: 'Ed25519',
      d: encode(keyPair.secretKey.subarray(0, 32)),
      x: encode(keyPair.publicKey),
    }),
  };
};

const initAtprotoJwt = async (): Promise<AtprotoJwt> => {
  const { secrets, atproto } = await config();
  const seed = atprotoJwtSeed(secrets.jwt);
  const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));
  const keys = await toJwk(keyPair);
  const issuer = `https://${atproto.handleDomain}`;
  return {
    sign: ({ payload, expirationTime, typ = ATPROTO_TOKEN_TYP }) =>
      new SignJWT(payload)
        .setProtectedHeader({ alg: 'EdDSA', typ })
        .setIssuedAt()
        .setIssuer(issuer)
        .setAudience(ATPROTO_TOKEN_AUD)
        .setExpirationTime(expirationTime)
        .setJti(uuidv7())
        .sign(keys.privateKey),
    verify: async (token) => {
      const result = await jwtVerify(token, keys.publicKey, {
        algorithms: ['EdDSA'],
        issuer,
        audience: ATPROTO_TOKEN_AUD,
      }).catch(() => undefined);
      return result?.payload;
    },
  };
};

let jwtPromise: Promise<AtprotoJwt> | undefined;

export const atprotoJwt = () => {
  if (!jwtPromise) jwtPromise = initAtprotoJwt();
  return jwtPromise;
};

export type AtprotoSessionClaims = {
  did: string;
  profileId: string;
  scope: string;
  jkt?: string;
};

export const createAtprotoTokens = async (claims: AtprotoSessionClaims) => {
  const jwt = await atprotoJwt();
  const payload: JWTPayload = {
    sub: claims.did,
    did: claims.did,
    profileId: claims.profileId,
    scope: claims.scope,
    ...(claims.jkt ? { cnf: { jkt: claims.jkt } } : {}),
  };
  const accessJwt = await jwt.sign({
    payload,
    expirationTime: ATPROTO_SESSION_EXP,
  });
  const refreshJwt = await jwt.sign({
    payload: { ...payload, tokenUse: 'refresh' },
    expirationTime: ATPROTO_REFRESH_EXP,
    typ: 'refresh+jwt',
  });
  return { accessJwt, refreshJwt };
};

export const verifyAtprotoAccess = async (
  token: string,
): Promise<AtprotoSessionClaims | undefined> => {
  const payload = await (await atprotoJwt()).verify(token);
  if (!payload || payload.tokenUse === 'refresh') return undefined;
  if (typeof payload.did !== 'string') return undefined;
  if (typeof payload.profileId !== 'string') return undefined;
  if (payload.scope !== ATPROTO_ACCESS_SCOPE) return undefined;
  const jkt =
    payload.cnf && typeof payload.cnf === 'object'
      ? (payload.cnf as { jkt?: unknown }).jkt
      : undefined;
  return {
    did: payload.did,
    profileId: payload.profileId,
    scope: payload.scope,
    ...(typeof jkt === 'string' ? { jkt } : {}),
  };
};

export const verifyAtprotoRefresh = async (
  token: string,
): Promise<AtprotoSessionClaims | undefined> => {
  const payload = await (await atprotoJwt()).verify(token);
  if (!payload || payload.tokenUse !== 'refresh') return undefined;
  if (typeof payload.did !== 'string') return undefined;
  if (typeof payload.profileId !== 'string') return undefined;
  return {
    did: payload.did,
    profileId: payload.profileId,
    scope: ATPROTO_ACCESS_SCOPE,
  };
};

export const dpopThumbprint = async (
  jwk: { kty: string } & Record<string, unknown>,
) => {
  const { calculateJwkThumbprint } = await import('jose');
  return calculateJwkThumbprint(jwk);
};

export const randomOauthCode = () =>
  crypto.randomBytes(32).toString('base64url');

export const atprotoPublicJwk = async () => {
  const { secrets } = await config();
  const seed = atprotoJwtSeed(secrets.jwt);
  const keyPair = nacl.sign.keyPair.fromSeed(new Uint8Array(seed));
  const encode = (bytes: Uint8Array) =>
    Buffer.from(bytes).toString('base64url');
  return {
    kty: 'OKP',
    crv: 'Ed25519',
    x: encode(keyPair.publicKey),
    use: 'sig',
    alg: 'EdDSA',
  };
};
