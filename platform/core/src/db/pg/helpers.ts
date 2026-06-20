import { and, eq, isNull, sql, type SQL } from 'drizzle-orm';
import type { PgDb } from './client';
import { nowIso } from './mappers';
import { uuidv7 } from 'uuidv7';

export type SoftDeleteTable = {
  id: unknown;
  deletedAt: unknown;
  updatedAt: unknown;
};

export const activeRow = <T extends SoftDeleteTable>(
  table: T,
): SQL | undefined => isNull(table.deletedAt as never);

export const findById = async <TRow>(
  db: PgDb,
  table: SoftDeleteTable & Record<string, unknown>,
  id: string,
  includeDeleted = false,
): Promise<TRow | undefined> => {
  const conditions = [eq(table.id as never, id)];
  if (!includeDeleted && table.deletedAt) {
    conditions.push(isNull(table.deletedAt as never));
  }
  const rows = await db
    .select()
    .from(table as never)
    .where(and(...conditions))
    .limit(1);
  return rows[0] as TRow | undefined;
};

export const softDeleteById = async (
  db: PgDb,
  table: SoftDeleteTable & Record<string, unknown>,
  id: string,
) => {
  await db
    .update(table as never)
    .set({
      deletedAt: nowIso(),
      updatedAt: nowIso(),
    } as never)
    .where(eq(table.id as never, id));
};

export const insertEdge = async (
  db: PgDb,
  table: Record<string, unknown> & { fromId: unknown; toId: unknown },
  fromId: string,
  toId: string,
  body: Record<string, unknown> = {},
) => {
  const id = uuidv7();
  const ts = nowIso();
  await db.insert(table as never).values({
    id,
    fromId,
    toId,
    body,
    createdAt: ts,
    updatedAt: ts,
  } as never);
  return id;
};

export const deleteEdge = async (
  db: PgDb,
  table: Record<string, unknown> & { fromId: unknown; toId: unknown },
  fromId: string,
  toId: string,
) => {
  await db
    .delete(table as never)
    .where(
      and(eq(table.fromId as never, fromId), eq(table.toId as never, toId)),
    );
};

export const countRows = async (
  db: PgDb,
  table: Record<string, unknown>,
  where?: SQL,
): Promise<number> => {
  const query = db
    .select({ count: sql<number>`count(*)::int` })
    .from(table as never);
  const result = (where ? await query.where(where) : await query) as {
    count: number;
  }[];
  return result[0]?.count ?? 0;
};
