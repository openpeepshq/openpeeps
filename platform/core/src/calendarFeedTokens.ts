import { randomBytes, createHash } from 'crypto';
import { eq } from 'drizzle-orm';
import { db } from './db/pg/client';
import { calendarFeedTokens } from './db/pg/schema';

const TOKEN_BYTES = 32;

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

  // Token expires in 90 days
  const expiresAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

  const result = await db
    .insert(calendarFeedTokens)
    .values({
      profileId,
      tokenHash,
      expiresAt: expiresAt.toISOString(),
    })
    .returning({ tokenId: calendarFeedTokens.id });

  return { plainToken, tokenId: result[0].tokenId };
};

export const findProfileByCalendarFeedToken = async (
  token: string,
): Promise<string | null> => {
  const tokenHash = hashToken(token);
  const result = await db
    .select({ profileId: calendarFeedTokens.profileId })
    .from(calendarFeedTokens)
    .where(eq(calendarFeedTokens.tokenHash, tokenHash))
    .limit(1);

  if (result.length === 0) {
    return null;
  }

  return result[0].profileId;
};

export const revokeCalendarFeedToken = async (
  tokenId: string,
  profileId: string,
): Promise<boolean> => {
  const result = await db
    .delete(calendarFeedTokens)
    .where(
      eq(calendarFeedTokens.id, tokenId),
    )
    .returning();

  return result.length > 0;
};

export const listCalendarFeedTokens = async (
  profileId: string,
): Promise<
  Array<{
    id: string;
    createdAt: string;
    expiresAt: string;
  }>
> => {
  const result = await db
    .select({
      id: calendarFeedTokens.id,
      createdAt: calendarFeedTokens.createdAt,
      expiresAt: calendarFeedTokens.expiresAt,
    })
    .from(calendarFeedTokens)
    .where(eq(calendarFeedTokens.profileId, profileId))
    .orderBy(calendarFeedTokens.createdAt);

  return result;
};
