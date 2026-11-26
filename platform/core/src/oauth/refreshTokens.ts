import { randomUUID } from 'crypto';
import { and, eq, isNull, type SQL } from 'drizzle-orm';
import { allpeepDb } from '../db';
import { oauthRefreshTokens } from '../db/pg/schema';
import { revokeAccessToken } from '../accessTokens/mutations';
import { randomToken, sha256Hex } from './crypto';
import { oauthError } from './errors';

const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

export type OAuthRefreshTokenRow = typeof oauthRefreshTokens.$inferSelect;

export const issueOAuthRefreshToken = async ({
  familyId = randomUUID(),
  ...data
}: {
  clientId: string;
  profileId: string;
  accountId?: string;
  scopes: string[];
  accessTokenId: string;
  authTime?: string | null;
  familyId?: string;
}): Promise<string> => {
  const token = randomToken();
  const { db } = await allpeepDb();
  await db.insert(oauthRefreshTokens).values({
    id: randomUUID(),
    tokenHash: sha256Hex(token),
    familyId,
    clientId: data.clientId,
    profileId: data.profileId,
    accountId: data.accountId ?? null,
    scopes: data.scopes,
    accessTokenId: data.accessTokenId,
    authTime: data.authTime ?? null,
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS).toISOString(),
  });
  return token;
};

export const findOAuthRefreshToken = async (
  token: string,
): Promise<OAuthRefreshTokenRow | undefined> => {
  const { db } = await allpeepDb();
  const [row] = await db
    .select()
    .from(oauthRefreshTokens)
    .where(eq(oauthRefreshTokens.tokenHash, sha256Hex(token)))
    .limit(1);
  return row;
};

const revokeWhere = async (where: SQL | undefined) => {
  const { db } = await allpeepDb();
  const revoked = await db
    .update(oauthRefreshTokens)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(where, isNull(oauthRefreshTokens.revokedAt)))
    .returning({ accessTokenId: oauthRefreshTokens.accessTokenId });
  await Promise.all(
    revoked.flatMap(({ accessTokenId }) =>
      accessTokenId ? [revokeAccessToken(accessTokenId)] : [],
    ),
  );
};

/** Revokes every rotation of one login, and the access tokens issued with it. */
export const revokeOAuthRefreshTokenFamily = (familyId: string) =>
  revokeWhere(eq(oauthRefreshTokens.familyId, familyId));

export const revokeOAuthRefreshTokens = ({
  clientId,
  profileId,
}: {
  clientId: string;
  profileId?: string;
}) =>
  revokeWhere(
    and(
      eq(oauthRefreshTokens.clientId, clientId),
      profileId ? eq(oauthRefreshTokens.profileId, profileId) : undefined,
    ),
  );

/**
 * Single-use redemption with reuse detection (OAuth 2.0 Security BCP §4.14):
 * a refresh token presented twice means it leaked, so the whole family dies.
 *
 * Trade-off: redemption marks the old rotation used before the new one is
 * handed out, so a client that crashes between receiving and persisting the
 * new token has no valid token left and must re-authenticate. We accept that
 * (with the 30-day TTL and the remembered consent, re-authenticating is a
 * single consent tap for known clients) because a grace period that keeps the
 * old rotation redeemable for a second is exactly the window the reuse
 * detector is meant to close.
 */
export const consumeOAuthRefreshToken = async (
  token: string,
  clientId: string,
): Promise<OAuthRefreshTokenRow> => {
  const row = await findOAuthRefreshToken(token);
  if (
    !row ||
    row.clientId !== clientId ||
    row.revokedAt ||
    new Date(row.expiresAt).getTime() <= Date.now()
  ) {
    throw oauthError('invalid_grant', 'Refresh token is invalid or expired');
  }
  const { db } = await allpeepDb();
  const claimed = row.usedAt
    ? []
    : await db
        .update(oauthRefreshTokens)
        .set({ usedAt: new Date().toISOString() })
        .where(
          and(
            eq(oauthRefreshTokens.id, row.id),
            isNull(oauthRefreshTokens.usedAt),
          ),
        )
        .returning({ id: oauthRefreshTokens.id });
  if (claimed.length === 0) {
    await revokeOAuthRefreshTokenFamily(row.familyId);
    throw oauthError('invalid_grant', 'Refresh token was already used');
  }
  return row;
};
