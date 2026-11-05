import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { pgDb } from '../db/pg/client';
import { atRecords, posts, profiles } from '../db/pg/schema/documents';
import { follows } from '../db/pg/schema/edges';
import { COLLECTIONS, atUriFor } from './records';
import { findProfileByDid } from './ingest';

const profileView = async (did: string) => {
  const db = pgDb();
  const [row] = await db
    .select({
      did: profiles.did,
      handle: profiles.handle,
      atHandle: profiles.atHandle,
      body: profiles.body,
    })
    .from(profiles)
    .where(and(eq(profiles.did, did), isNull(profiles.deletedAt)))
    .limit(1);
  if (!row?.did) return null;
  const body = (row.body ?? {}) as {
    displayName?: string;
    bio?: string;
    avatar?: string;
  };
  return {
    did: row.did,
    handle: row.atHandle ?? row.handle,
    displayName: body.displayName,
    description: body.bio,
    avatar: body.avatar,
  };
};

export const getProfileView = async (actor: string) => {
  const profile = actor.startsWith('did:')
    ? await findProfileByDid(actor)
    : undefined;
  const did = profile?.did ?? (actor.startsWith('did:') ? actor : null);
  if (!did) {
    const db = pgDb();
    const [row] = await db
      .select({ did: profiles.did })
      .from(profiles)
      .where(
        and(
          eq(profiles.atHandle, actor.toLowerCase()),
          isNull(profiles.deletedAt),
        ),
      )
      .limit(1);
    if (!row?.did) return null;
    return profileView(row.did);
  }
  return profileView(did);
};

export const getProfileViews = async (actors: string[]) => {
  const views = await Promise.all(actors.map((actor) => getProfileView(actor)));
  return views.filter((view) => view != null);
};

export const getAuthorFeed = async (actor: string, limit = 50) => {
  const view = await getProfileView(actor);
  if (!view) return { feed: [] };
  const db = pgDb();
  const rows = await db
    .select()
    .from(atRecords)
    .where(
      and(
        eq(atRecords.did, view.did),
        eq(atRecords.collection, COLLECTIONS.post),
        isNull(atRecords.deletedAt),
      ),
    )
    .orderBy(desc(atRecords.rkey))
    .limit(Math.min(limit, 100));
  return {
    feed: rows.map((row) => ({
      post: {
        uri: atUriFor(view.did, row.collection, row.rkey),
        cid: row.cid,
        author: view,
        record: row.record,
      },
    })),
  };
};

export const getPostsByAtUris = async (uris: string[]) => {
  if (uris.length === 0) return { posts: [] };
  const db = pgDb();
  const rows = await db
    .select({
      atUri: posts.atUri,
      cid: posts.cid,
      creatorId: posts.creatorId,
      visibility: posts.visibility,
      type: posts.type,
    })
    .from(posts)
    .where(
      and(
        inArray(posts.atUri, uris),
        eq(posts.visibility, 'public'),
        isNull(posts.deletedAt),
      ),
    );
  const postsOut = [];
  for (const row of rows) {
    if (!row.atUri || !row.cid) continue;
    const [creator] = await db
      .select({ did: profiles.did, atHandle: profiles.atHandle })
      .from(profiles)
      .where(eq(profiles.id, row.creatorId))
      .limit(1);
    if (!creator?.did) continue;
    postsOut.push({
      uri: row.atUri,
      cid: row.cid,
      author: {
        did: creator.did,
        handle: creator.atHandle,
      },
    });
  }
  return { posts: postsOut };
};

export const getPostThread = async (uri: string) => {
  const db = pgDb();
  const [root] = await db
    .select({
      id: posts.id,
      atUri: posts.atUri,
      cid: posts.cid,
      visibility: posts.visibility,
    })
    .from(posts)
    .where(and(eq(posts.atUri, uri), isNull(posts.deletedAt)))
    .limit(1);
  if (!root?.atUri || root.visibility !== 'public') return null;
  const replies = await db
    .select({
      atUri: posts.atUri,
      cid: posts.cid,
      visibility: posts.visibility,
    })
    .from(posts)
    .where(and(eq(posts.inReplyToUri, uri), isNull(posts.deletedAt)));
  return {
    thread: {
      post: { uri: root.atUri, cid: root.cid },
      replies: replies
        .filter((row) => row.visibility === 'public' && row.atUri)
        .map((row) => ({ post: { uri: row.atUri, cid: row.cid } })),
    },
  };
};

const didForProfileId = async (profileId: string) => {
  const db = pgDb();
  const [row] = await db
    .select({ did: profiles.did, atHandle: profiles.atHandle })
    .from(profiles)
    .where(eq(profiles.id, profileId))
    .limit(1);
  return row;
};

export const getFollows = async (actor: string) => {
  const view = await getProfileView(actor);
  if (!view) return { follows: [] };
  const profile = await findProfileByDid(view.did);
  if (!profile) return { follows: [] };
  const db = pgDb();
  const rows = await db
    .select({ toId: follows.toId })
    .from(follows)
    .where(eq(follows.fromId, profile.id));
  const followsOut = [];
  for (const row of rows) {
    const target = await didForProfileId(row.toId);
    if (target?.did) {
      followsOut.push({ did: target.did, handle: target.atHandle });
    }
  }
  return { follows: followsOut, subject: view };
};

export const getFollowers = async (actor: string) => {
  const view = await getProfileView(actor);
  if (!view) return { followers: [] };
  const profile = await findProfileByDid(view.did);
  if (!profile) return { followers: [] };
  const db = pgDb();
  const rows = await db
    .select({ fromId: follows.fromId })
    .from(follows)
    .where(eq(follows.toId, profile.id));
  const followers = [];
  for (const row of rows) {
    const source = await didForProfileId(row.fromId);
    if (source?.did) {
      followers.push({ did: source.did, handle: source.atHandle });
    }
  }
  return { followers, subject: view };
};

export const getRelationships = async (actor: string, others: string[]) => {
  const view = await getProfileView(actor);
  if (!view) return { relationships: [] };
  const relationships = [];
  for (const other of others) {
    const otherView = await getProfileView(other);
    if (!otherView) continue;
    const actorProfile = await findProfileByDid(view.did);
    const otherProfile = await findProfileByDid(otherView.did);
    if (!actorProfile || !otherProfile) continue;
    const db = pgDb();
    const [following] = await db
      .select({ id: follows.id })
      .from(follows)
      .where(
        and(
          eq(follows.fromId, actorProfile.id),
          eq(follows.toId, otherProfile.id),
        ),
      )
      .limit(1);
    const [followedBy] = await db
      .select({ id: follows.id })
      .from(follows)
      .where(
        and(
          eq(follows.fromId, otherProfile.id),
          eq(follows.toId, actorProfile.id),
        ),
      )
      .limit(1);
    relationships.push({
      did: otherView.did,
      following: following
        ? `at://${view.did}/app.bsky.graph.follow/${following.id}`
        : undefined,
      followedBy: followedBy
        ? `at://${otherView.did}/app.bsky.graph.follow/${followedBy.id}`
        : undefined,
    });
  }
  return { relationships };
};
