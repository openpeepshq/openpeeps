import { and, eq, inArray, or } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { PgDb } from '../db/pg/client';
import { nowIso } from '../db/pg/mappers';
import { blocks, follows, requestsFollow } from '../db/pg/schema/edges';

export const listBlockingIds = async (
  db: PgDb,
  profileId: string,
): Promise<string[]> => {
  const rows = await db
    .select({ toId: blocks.toId })
    .from(blocks)
    .where(eq(blocks.fromId, profileId));
  return rows.map((row) => row.toId);
};

export const listBlockedByIds = async (
  db: PgDb,
  profileId: string,
): Promise<string[]> => {
  const rows = await db
    .select({ fromId: blocks.fromId })
    .from(blocks)
    .where(eq(blocks.toId, profileId));
  return rows.map((row) => row.fromId);
};

export const loadBlockIds = async (
  db: PgDb,
  profileId: string,
): Promise<{ blockingIds: string[]; blockedByIds: string[] }> => {
  const [blockingIds, blockedByIds] = await Promise.all([
    listBlockingIds(db, profileId),
    listBlockedByIds(db, profileId),
  ]);
  return { blockingIds, blockedByIds };
};

export const insertBlock = async (
  db: PgDb,
  fromId: string,
  toId: string,
): Promise<void> => {
  const ts = nowIso();
  await db
    .insert(blocks)
    .values({
      id: uuidv7(),
      fromId,
      toId,
      body: {},
      createdAt: ts,
      updatedAt: ts,
    })
    .onConflictDoNothing();
};

export const deleteBlock = async (
  db: PgDb,
  fromId: string,
  toId: string,
): Promise<void> => {
  await db
    .delete(blocks)
    .where(and(eq(blocks.fromId, fromId), eq(blocks.toId, toId)));
};

const eitherDirection = (a: string, b: string) =>
  or(
    and(eq(follows.fromId, a), eq(follows.toId, b)),
    and(eq(follows.fromId, b), eq(follows.toId, a)),
  )!;

const eitherFollowRequest = (a: string, b: string) =>
  or(
    and(eq(requestsFollow.fromId, a), eq(requestsFollow.toId, b)),
    and(eq(requestsFollow.fromId, b), eq(requestsFollow.toId, a)),
  )!;

export const dropFollowsBetween = async (
  db: PgDb,
  a: string,
  b: string,
): Promise<void> => {
  await Promise.all([
    db.delete(follows).where(eitherDirection(a, b)),
    db.delete(requestsFollow).where(eitherFollowRequest(a, b)),
  ]);
};

export const areBlocked = async (
  db: PgDb,
  a: string,
  b: string,
): Promise<boolean> => {
  if (!a || !b || a === b) return false;
  const rows = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(
      or(
        and(eq(blocks.fromId, a), eq(blocks.toId, b)),
        and(eq(blocks.fromId, b), eq(blocks.toId, a)),
      ),
    )
    .limit(1);
  return rows.length > 0;
};

export const hasBlockAmong = async (
  db: PgDb,
  ids: string[],
): Promise<boolean> => {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length < 2) return false;
  const rows = await db
    .select({ id: blocks.id })
    .from(blocks)
    .where(and(inArray(blocks.fromId, unique), inArray(blocks.toId, unique)))
    .limit(1);
  return rows.length > 0;
};
