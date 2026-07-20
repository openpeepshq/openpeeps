import { and, eq, sql } from 'drizzle-orm';
import type { PgDb } from '../client';
import { posts } from '../schema/documents';
import { entries, postGroups, postSeen } from '../schema/edges';
import { normalizeIsoDatetime } from '../mappers';
import { asTable } from '../map/registry';
import { getEdgeTable } from '../map/filters';

type Doc = Record<string, unknown>;

const maxIso = (values: (string | null | undefined)[]): string | null => {
  const dates = values.filter((v): v is string => !!v);
  if (!dates.length) return null;
  return normalizeIsoDatetime(dates.reduce((a, b) => (a > b ? a : b)));
};

export const profileDerived = {
  postsCount: async (db: PgDb, doc: Doc): Promise<number> => {
    const postsTable = asTable(posts);
    const rows = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(posts)
      .where(
        and(
          eq(postsTable.creatorId as never, doc.id as string),
          sql`${postsTable.deletedAt} IS NULL`,
        ),
      );
    return (rows[0] as { count?: number } | undefined)?.count ?? 0;
  },

  lastSeen: async (db: PgDb, doc: Doc): Promise<string | null> => {
    const profileId = doc.id as string;
    const entriesTable = asTable(entries);
    const postSeenTable = asTable(postSeen);
    const [entryRows, seenRows] = await Promise.all([
      db
        .select({ max: sql<string | null>`max(${entriesTable.createdAt})` })
        .from(entries)
        .where(eq(entriesTable.fromId as never, profileId)),
      db
        .select({ max: sql<string | null>`max(${postSeenTable.createdAt})` })
        .from(postSeen)
        .where(eq(postSeenTable.fromId as never, profileId)),
    ]);
    return maxIso([
      (entryRows[0] as { max?: string | null } | undefined)?.max,
      (seenRows[0] as { max?: string | null } | undefined)?.max,
    ]);
  },

  profileStats: (_db: PgDb, doc: Doc) => ({
    followersCount: Array.isArray(doc.followers) ? doc.followers.length : 0,
    followingCount: Array.isArray(doc.following) ? doc.following.length : 0,
  }),
};

export const postDerived = {
  seen:
    (profileId?: string) =>
    async (db: PgDb, doc: Doc): Promise<boolean> => {
      if (!profileId) return false;
      const edgeTableRef = getEdgeTable('postSeen');
      const edgeTable = asTable(edgeTableRef);
      const rows = await db
        .select({ one: sql`1` })
        .from(edgeTableRef as never)
        .where(
          and(
            eq(edgeTable.fromId as never, profileId),
            eq(edgeTable.toId as never, doc.id as string),
          ),
        )
        .limit(1);
      return rows.length > 0;
    },

  inReplyToId: (_db: PgDb, doc: Doc) =>
    (doc.replyTo as { id?: string } | undefined)?.id,

  groupId: (_db: PgDb, doc: Doc) =>
    (doc.group as { id?: string } | undefined)?.id,
};

export const groupDerived = {
  lastPostAt: async (db: PgDb, doc: Doc): Promise<string | null> => {
    const edgeTableRef = getEdgeTable('postGroups');
    const edgeTable = asTable(edgeTableRef);
    const rows = await db
      .select({ max: sql<string | null>`max(${edgeTable.createdAt})` })
      .from(edgeTableRef as never)
      .where(eq(edgeTable.toId as never, doc.id as string));
    const value = (rows[0] as { max?: string | null } | undefined)?.max;
    return value ? normalizeIsoDatetime(value) : null;
  },
};
