import { eq } from 'drizzle-orm';
import {
  calculateJwkThumbprint,
  exportJWK,
  generateKeyPair,
  importJWK,
  SignJWT,
  type JWK,
} from 'jose';
import { allpeepDb } from '../db';
import { configs } from '../db/pg/schema';
import { nowIso } from '../db/pg/mappers';

// id_tokens are RS256 (the OIDC default every relying party supports), so they
// cannot reuse the Ed25519 access-token key derived from `secrets.jwt`. The
// RSA key is generated once and persisted next to the other config documents.
const SIGNING_KEY_CONFIG = 'openpeeps-oauth-signing-key';

const loadOrCreatePrivateJwk = async (): Promise<JWK> => {
  const { db } = await allpeepDb();
  const read = async () => {
    const [row] = await db
      .select()
      .from(configs)
      .where(eq(configs.key, SIGNING_KEY_CONFIG))
      .limit(1);
    return (row?.body as { privateJwk?: JWK } | undefined)?.privateJwk;
  };
  const existing = await read();
  if (existing) return existing;

  const { privateKey } = await generateKeyPair('RS256', { extractable: true });
  const ts = nowIso();
  await db
    .insert(configs)
    .values({
      key: SIGNING_KEY_CONFIG,
      body: { privateJwk: await exportJWK(privateKey) },
      createdAt: ts,
      updatedAt: ts,
    })
    .onConflictDoNothing();
  // Re-read: a concurrent process may have won the insert.
  const stored = await read();
  if (!stored) throw new Error('OAuth signing key could not be stored');
  return stored;
};

const initSigningKey = async () => {
  const privateJwk = await loadOrCreatePrivateJwk();
  const { kty, n, e } = privateJwk;
  const publicJwk = { kty, n, e };
  const kid = await calculateJwkThumbprint(publicJwk);
  return {
    kid,
    privateKey: await importJWK(privateJwk, 'RS256'),
    publicJwk: { ...publicJwk, kid, alg: 'RS256', use: 'sig' },
  };
};

let signingKey: ReturnType<typeof initSigningKey> | undefined;

const oauthSigningKey = () => {
  if (!signingKey) {
    signingKey = initSigningKey().catch((error) => {
      signingKey = undefined;
      throw error;
    });
  }
  return signingKey;
};

export const oauthJwks = async () => ({
  keys: [(await oauthSigningKey()).publicJwk],
});

export const signIdToken = async ({
  issuer,
  clientId,
  claims,
  nonce,
  authTime,
}: {
  issuer: string;
  clientId: string;
  claims: Record<string, string | boolean> & { sub: string };
  nonce?: string;
  authTime?: number;
}): Promise<string> => {
  const { kid, privateKey } = await oauthSigningKey();
  return new SignJWT({
    ...claims,
    azp: clientId,
    ...(nonce ? { nonce } : {}),
    ...(authTime ? { auth_time: authTime } : {}),
  })
    .setProtectedHeader({ alg: 'RS256', kid, typ: 'JWT' })
    .setIssuer(issuer)
    .setAudience(clientId)
    .setIssuedAt()
    .setExpirationTime('1h')
    .sign(privateKey);
};
