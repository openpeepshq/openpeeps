import { createHash, randomBytes, randomUUID } from 'crypto';
import { and, eq, gt } from 'drizzle-orm';
import { allpeepDb } from '../db';
import { calendarFeedTokens } from '../db/pg/schema';

const TOKEN_BYTES = 32;

// `expires_at` is a `timestamptz` column declared with drizzle mode 'string',
// so the 90-day expiry is written and compared as an ISO timestamp string.

export const generateCalendarFeedToken = (): string => {
  return randomBytes(TOKEN_BYTES).toString('hex');
};

export const hashToken = (token: string): string => {
  return createHash('sha256').update(token).digest('hex');
};

export const createCalendarFeedToken = async (
  profileId: string,
): Promise<{ plainToken: string; tokenId: string }> => {
  const plainToken = generateCalendarFeedToken();
  const tokenHash = hashToken(plainToken);

  // Token expires in 90 days (see the module-level `expires_at` note above).
  const expiresAt = new Date(
    Date.now() + 90 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const { db } = await allpeepDb();
  const result = await db
    .insert(calendarFeedTokens)
    .values({
      id: randomUUID(),
      profileId,
      tokenHash,
      expiresAt,
    })
    .returning({ tokenId: calendarFeedTokens.id });

  return { plainToken, tokenId: result[0].tokenId };
};

/** Revoke every token owned by the profile ("reset calendar link" semantics). */
export const revokeAllCalendarFeedTokens = async (
  profileId: string,
): Promise<number> => {
  const { db } = await allpeepDb();
  const result = await db
    .delete(calendarFeedTokens)
    .where(eq(calendarFeedTokens.profileId, profileId))
    .returning({ id: calendarFeedTokens.id });

  return result.length;
};

export const findProfileByCalendarFeedToken = async (
  token: string,
): Promise<string | null> => {
  const tokenHash = hashToken(token);
  const { db } = await allpeepDb();
  const result = await db
    .select({ profileId: calendarFeedTokens.profileId })
    .from(calendarFeedTokens)
    .where(
      and(
        eq(calendarFeedTokens.tokenHash, tokenHash),
        // Expired tokens must not resolve (see the module-level `expires_at`
        // note above for the storage shape).
        gt(calendarFeedTokens.expiresAt, new Date().toISOString()),
      ),
    )
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0].profileId;
};
