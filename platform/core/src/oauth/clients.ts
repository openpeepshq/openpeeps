import { randomUUID } from 'crypto';
import { asc, eq } from 'drizzle-orm';
import {
  oauthClientCreationSchema,
  type OAuthClient,
  type OAuthClientCreated,
  type OAuthClientCreation,
} from '@openpeepshq/common/types';
import { config } from '../config';
import { allpeepDb } from '../db';
import { oauthClients, oauthGrants } from '../db/pg/schema';
import { randomToken, safeEqual, sha256Hex } from './crypto';
import { oauthError } from './errors';
import { isAllowedRedirectUri } from './redirectUris';
import { revokeOAuthRefreshTokens } from './refreshTokens';

type OAuthClientRow = typeof oauthClients.$inferSelect;
export type OAuthClientRecord = OAuthClient & {
  secretHash: string | null;
  secretExpiresAt: string | null;
};

const toRecord = (row: OAuthClientRow): OAuthClientRecord => ({
  id: row.id,
  name: row.name,
  redirectUris: row.redirectUris,
  confidential: !!row.secretHash,
  firstParty: row.firstParty,
  dynamic: row.dynamic,
  clientUri: row.clientUri,
  logoUri: row.logoUri,
  createdAt: row.createdAt,
  secretHash: row.secretHash,
  secretExpiresAt: row.secretExpiresAt,
});

export const toPublicOAuthClient = ({
  secretHash: _secretHash,
  secretExpiresAt: _secretExpiresAt,
  ...client
}: OAuthClientRecord): OAuthClient => client;

export const createOAuthClient = async (
  input: OAuthClientCreation,
  { dynamic = false }: { dynamic?: boolean } = {},
): Promise<OAuthClientCreated> => {
  const parsed = oauthClientCreationSchema.safeParse(input);
  if (!parsed.success) {
    throw oauthError('invalid_client_metadata', parsed.error.message);
  }
  const data = parsed.data;
  const invalid = data.redirectUris.find((uri) => !isAllowedRedirectUri(uri));
  if (invalid) {
    throw oauthError(
      'invalid_redirect_uri',
      `Redirect URI not allowed: ${invalid}`,
    );
  }
  const clientSecret = data.confidential ? randomToken() : undefined;
  // RFC 7591 §3.2.1 encourages rotating secrets: dynamically registered
  // ones expire, admin-registered ones (whose owner manages them) do not.
  const { oauth } = await config();
  const secretExpiresAt =
    dynamic && data.confidential && oauth.clientSecretLifetimeSeconds > 0
      ? new Date(
          Date.now() + oauth.clientSecretLifetimeSeconds * 1000,
        ).toISOString()
      : null;
  const { db } = await allpeepDb();
  const [row] = await db
    .insert(oauthClients)
    .values({
      id: randomUUID(),
      name: data.name,
      redirectUris: data.redirectUris,
      secretHash: clientSecret ? sha256Hex(clientSecret) : null,
      secretExpiresAt,
      firstParty: !dynamic && data.firstParty,
      dynamic,
      clientUri: data.clientUri ?? null,
      logoUri: data.logoUri ?? null,
    })
    .returning();
  return { ...toPublicOAuthClient(toRecord(row)), clientSecret };
};

export const findOAuthClient = async (
  id: string,
): Promise<OAuthClientRecord | undefined> => {
  const { db } = await allpeepDb();
  const [row] = await db
    .select()
    .from(oauthClients)
    .where(eq(oauthClients.id, id))
    .limit(1);
  return row ? toRecord(row) : undefined;
};

export const listOAuthClients = async (): Promise<OAuthClient[]> => {
  const { db } = await allpeepDb();
  const rows = await db
    .select()
    .from(oauthClients)
    .orderBy(asc(oauthClients.createdAt));
  return rows.map((row) => toPublicOAuthClient(toRecord(row)));
};

export const deleteOAuthClient = async (id: string): Promise<boolean> => {
  await revokeOAuthRefreshTokens({ clientId: id });
  const { db } = await allpeepDb();
  await db.delete(oauthGrants).where(eq(oauthGrants.clientId, id));
  const deleted = await db
    .delete(oauthClients)
    .where(eq(oauthClients.id, id))
    .returning({ id: oauthClients.id });
  return deleted.length > 0;
};

/**
 * Issues a replacement secret for a confidential client. The old secret stops
 * authenticating (stored hash replaced); already-issued tokens are kept.
 * Dynamic clients get the configured lifetime applied to the new secret.
 */
export const rotateOAuthClientSecret = async (
  id: string,
): Promise<string | undefined> => {
  const client = await findOAuthClient(id);
  if (!client?.secretHash) return undefined;
  const { oauth } = await config();
  const clientSecret = randomToken();
  const secretExpiresAt =
    client.dynamic && oauth.clientSecretLifetimeSeconds > 0
      ? new Date(
          Date.now() + oauth.clientSecretLifetimeSeconds * 1000,
        ).toISOString()
      : null;
  const { db } = await allpeepDb();
  await db
    .update(oauthClients)
    .set({
      secretHash: sha256Hex(clientSecret),
      secretExpiresAt,
      updatedAt: new Date().toISOString(),
    })
    .where(eq(oauthClients.id, id));
  return clientSecret;
};

/** Confidential clients must present their secret; public clients never do. */
export const authenticateOAuthClient = async (
  clientId: string | undefined,
  clientSecret: string | undefined,
): Promise<OAuthClientRecord> => {
  const client = clientId ? await findOAuthClient(clientId) : undefined;
  if (!client) {
    throw oauthError('invalid_client', 'Unknown client');
  }
  if (
    client.secretHash &&
    !(clientSecret && safeEqual(sha256Hex(clientSecret), client.secretHash))
  ) {
    throw oauthError('invalid_client', 'Client authentication failed');
  }
  if (
    client.secretHash &&
    client.secretExpiresAt &&
    new Date(client.secretExpiresAt).getTime() <= Date.now()
  ) {
    throw oauthError('invalid_client', 'The client secret has expired');
  }
  return client;
};
