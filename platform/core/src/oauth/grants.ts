import { and, desc, eq } from 'drizzle-orm';
import type { OAuthGrant } from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { oauthClients, oauthGrants } from '../db/pg/schema';
import { revokeOAuthRefreshTokens } from './refreshTokens';

const grantKey = (profileId: string, clientId: string) =>
  and(eq(oauthGrants.profileId, profileId), eq(oauthGrants.clientId, clientId));

export const findOAuthGrant = async (profileId: string, clientId: string) => {
  const { db } = await allpeepDb();
  const [row] = await db
    .select()
    .from(oauthGrants)
    .where(grantKey(profileId, clientId))
    .limit(1);
  return row;
};

/** Adds scopes to the remembered consent; earlier grants are kept. */
export const upsertOAuthGrant = async (
  profileId: string,
  clientId: string,
  scopes: string[],
) => {
  const existing = await findOAuthGrant(profileId, clientId);
  const merged = [...new Set([...(existing?.scopes ?? []), ...scopes])];
  const { db } = await allpeepDb();
  await db
    .insert(oauthGrants)
    .values({ profileId, clientId, scopes: merged })
    .onConflictDoUpdate({
      target: [oauthGrants.profileId, oauthGrants.clientId],
      set: { scopes: merged, updatedAt: new Date().toISOString() },
    });
};

export const listOAuthGrants = async (
  profileId: string,
): Promise<OAuthGrant[]> => {
  const { db } = await allpeepDb();
  return db
    .select({
      clientId: oauthGrants.clientId,
      clientName: oauthClients.name,
      scopes: oauthGrants.scopes,
      createdAt: oauthGrants.createdAt,
      updatedAt: oauthGrants.updatedAt,
    })
    .from(oauthGrants)
    .innerJoin(oauthClients, eq(oauthClients.id, oauthGrants.clientId))
    .where(eq(oauthGrants.profileId, profileId))
    .orderBy(desc(oauthGrants.updatedAt));
};

/**
 * Forgets consent and signs the app out: revokes the grant's refresh tokens and
 * the access tokens issued with them (the refresh-token cascade). Access tokens
 * issued without `offline_access` have no refresh token to cascade from, so
 * they lapse with their TTL rather than being revoked here.
 */
export const revokeOAuthGrant = async (profileId: string, clientId: string) => {
  await revokeOAuthRefreshTokens({ clientId, profileId });
  const { db } = await allpeepDb();
  const deleted = await db
    .delete(oauthGrants)
    .where(grantKey(profileId, clientId))
    .returning({ clientId: oauthGrants.clientId });
  return deleted.length > 0;
};
