import { and, eq, isNull } from 'drizzle-orm';
import { pgDb } from '../db/pg/client';
import { posts } from '../db/pg/schema/documents';

export type PublicNote = {
  id: string;
  creatorId: string;
  content: string;
  published: string;
  inReplyToUri: string | null;
};

type PostBody = {
  type?: string;
  content?: string;
};

export const loadPublicNote = async (
  postId: string,
): Promise<PublicNote | null> => {
  const db = pgDb();
  const [row] = await db
    .select({
      id: posts.id,
      type: posts.type,
      visibility: posts.visibility,
      creatorId: posts.creatorId,
      body: posts.body,
      inReplyToUri: posts.inReplyToUri,
      createdAt: posts.createdAt,
      deletedAt: posts.deletedAt,
    })
    .from(posts)
    .where(and(eq(posts.id, postId), isNull(posts.deletedAt)))
    .limit(1);
  if (!row || row.type !== 'note' || row.visibility !== 'public') return null;
  const body = (row.body ?? {}) as PostBody;
  return {
    id: row.id,
    creatorId: row.creatorId,
    content: body.content ?? '',
    published: row.createdAt,
    inReplyToUri: row.inReplyToUri,
  };
};
