import { and, eq, isNotNull, isNull } from 'drizzle-orm';
import { pgDb } from '../db/pg/client';
import { posts } from '../db/pg/schema/documents';
import { profiles } from '../db/pg/schema/documents';
import { mentions } from '../db/pg/schema/edges';

export type PublicNote = {
  id: string;
  creatorId: string;
  content: string;
  published: string;
  inReplyToUri: string | null;
  /**
   * Actor URIs of remote (federated) profiles mentioned in the note.
   * Populated only by `loadPublicNote`'s mention-join and consumed only by the
   * server's Fedify Note dispatcher (which CCs the mentionees); there is no
   * other consumer today. Keep any new consumer server-dispatcher-side so the
   * join stays scoped to federation delivery.
   *
   * Deliberately **create-time-frozen**: `updatePost` re-links hashtags but
   * does not re-resolve/re-connect mention edges (the pre-existing local
   * semantic — a local edit has never changed who is mentioned, and
   * notification re-fan-out on edit is not in scope). Every subsequent
   * `Update(Note)` therefore CCs the *original* mention set: a mention added
   * on an edit is not CC'd remotely, and a removed one stays CC'd until the
   * note is deleted. That is a documented decision (Phase R review round 4,
   * item 2), not an accident — if remote edit-time mention changes become
   * required, re-link the mention edges in `updatePost` first.
   */
  mentionUris: string[];
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
    .where(
      and(
        eq(posts.id, postId),
        isNull(posts.deletedAt),
        isNotNull(posts.publishedAt),
      ),
    )
    .limit(1);
  if (!row || row.type !== 'note' || row.visibility !== 'public') return null;
  const body = (row.body ?? {}) as PostBody;
  const mentionRows = await db
    .select({ uri: profiles.uri })
    .from(mentions)
    .innerJoin(profiles, eq(mentions.toId, profiles.id))
    .where(
      and(
        eq(mentions.fromId, postId),
        isNull(profiles.deletedAt),
        eq(profiles.type, 'federated'),
      ),
    );
  const mentionUris = mentionRows
    .map((m) => m.uri)
    .filter((uri): uri is string => Boolean(uri));
  return {
    id: row.id,
    creatorId: row.creatorId,
    content: body.content ?? '',
    published: row.createdAt,
    inReplyToUri: row.inReplyToUri,
    mentionUris,
  };
};
