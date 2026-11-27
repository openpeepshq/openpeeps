import { and, desc, eq, inArray, isNull, or } from 'drizzle-orm';
import { pgDb } from '../db/pg/client';
import { atRecords, posts, profiles } from '../db/pg/schema/documents';
import { follows, replyTo } from '../db/pg/schema/edges';
import { COLLECTIONS } from './records';
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
    atAvatar?: string;
    discoverable?: boolean;
    indexable?: boolean;
  };
  // Opt-out flags win: a profile that is neither discoverable nor indexable
  // must not appear in the public AppView at all.
  if (body.discoverable === false || body.indexable === false) return null;
  return {
    did: row.did,
    handle: row.atHandle ?? row.handle,
    displayName: body.displayName,
    description: body.bio,
    // Remote ingest stores the avatar as an at:// ref under `atAvatar`;
    // local profiles carry a plain URL under `avatar`.
    avatar: body.avatar ?? body.atAvatar,
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
  // Read through `posts` so visibility/deletion changes are honored live;
  // `at_records` alone would keep serving retracted notes.
  const rows = await db
    .select({
      atUri: posts.atUri,
      cid: posts.cid,
      record: atRecords.record,
      rkey: atRecords.rkey,
    })
    .from(posts)
    .innerJoin(
      atRecords,
      and(
        eq(atRecords.postId, posts.id),
        eq(atRecords.collection, COLLECTIONS.post),
        isNull(atRecords.deletedAt),
      ),
    )
    .where(
      and(
        eq(posts.creatorId, (await findProfileByDid(view.did))?.id ?? ''),
        eq(posts.visibility, 'public'),
        isNull(posts.deletedAt),
      ),
    )
    .orderBy(desc(atRecords.rkey))
    .limit(Math.min(Math.max(limit, 1), 100));
  return {
    feed: rows
      .filter((row) => row.atUri && row.cid)
      .map((row) => ({
        post: {
          uri: row.atUri as string,
          cid: row.cid as string,
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
  const creatorIds = [...new Set(rows.map((row) => row.creatorId))];
  const creators = creatorIds.length
    ? await db
        .select({
          id: profiles.id,
          did: profiles.did,
          atHandle: profiles.atHandle,
        })
        .from(profiles)
        .where(inArray(profiles.id, creatorIds))
    : [];
  const creatorById = new Map(creators.map((creator) => [creator.id, creator]));
  const postsOut = [];
  for (const row of rows) {
    if (!row.atUri || !row.cid) continue;
    const creator = creatorById.get(row.creatorId);
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
  // Replies are stored as `replyTo` edges (reply post -> parent post), not
  // via `posts.inReplyToUri`: every creation path resolves the parent to its
  // local post id, so matching the at:// uri against `inReplyToUri` could
  // never match and the thread always came back empty.
  const edges = await db
    .select({ fromId: replyTo.fromId })
    .from(replyTo)
    .where(eq(replyTo.toId, root.id));
  if (edges.length === 0)
    return {
      thread: { post: { uri: root.atUri, cid: root.cid }, replies: [] },
    };
  const replies = await db
    .select({
      atUri: posts.atUri,
      cid: posts.cid,
      visibility: posts.visibility,
    })
    .from(posts)
    .where(
      and(
        inArray(
          posts.id,
          edges.map((edge) => edge.fromId),
        ),
        isNull(posts.deletedAt),
      ),
    );
  return {
    thread: {
      post: { uri: root.atUri, cid: root.cid },
      replies: replies
        .filter((row) => row.visibility === 'public' && row.atUri)
        .map((row) => ({ post: { uri: row.atUri, cid: row.cid } })),
    },
  };
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
  if (rows.length === 0) return { follows: [], subject: view };
  const targets = await db
    .select({
      id: profiles.id,
      did: profiles.did,
      atHandle: profiles.atHandle,
      body: profiles.body,
    })
    .from(profiles)
    .where(
      and(
        inArray(
          profiles.id,
          rows.map((row) => row.toId),
        ),
        isNull(profiles.deletedAt),
      ),
    );
  const followsOut = [];
  for (const target of targets) {
    if (!target.did) continue;
    const targetBody = (target.body ?? {}) as { hideSocialGraph?: boolean };
    if (targetBody.hideSocialGraph === true) continue;
    followsOut.push({ did: target.did, handle: target.atHandle });
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
  if (rows.length === 0) return { followers: [], subject: view };
  const sources = await db
    .select({
      id: profiles.id,
      did: profiles.did,
      atHandle: profiles.atHandle,
      body: profiles.body,
    })
    .from(profiles)
    .where(
      and(
        inArray(
          profiles.id,
          rows.map((row) => row.fromId),
        ),
        isNull(profiles.deletedAt),
      ),
    );
  const followers = [];
  for (const source of sources) {
    if (!source.did) continue;
    const sourceBody = (source.body ?? {}) as { hideSocialGraph?: boolean };
    if (sourceBody.hideSocialGraph === true) continue;
    followers.push({ did: source.did, handle: source.atHandle });
  }
  return { followers, subject: view };
};
export const getRelationships = async (actor: string, others: string[]) => {
  const view = await getProfileView(actor);
  if (!view) return { relationships: [] };
  const otherViews = (
    await Promise.all(others.map((other) => getProfileView(other)))
  ).filter((otherView): otherView is NonNullable<typeof otherView> =>
    Boolean(otherView),
  );
  if (otherViews.length === 0) return { relationships: [] };
  const db = pgDb();
  // Resolve the actor and every other profile in one query: the old code
  // fetched each `others` entry and the actor profile per row.
  const allProfiles = await db
    .select({
      id: profiles.id,
      did: profiles.did,
    })
    .from(profiles)
    .where(
      and(
        isNull(profiles.deletedAt),
        or(
          eq(profiles.did, view.did),
          inArray(
            profiles.did,
            otherViews.map((otherView) => otherView.did),
          ),
        ),
      ),
    );
  const profileByDid = new Map(
    allProfiles
      .filter((profile): profile is typeof profile & { did: string } =>
        Boolean(profile.did),
      )
      .map((profile) => [profile.did, profile]),
  );
  const actorProfile = profileByDid.get(view.did);
  const othersResolved = otherViews.flatMap((otherView) => {
    const otherProfile = profileByDid.get(otherView.did);
    return otherProfile ? [{ otherView, otherProfile }] : [];
  });
  if (!actorProfile || othersResolved.length === 0)
    return { relationships: [] };
  const otherIds = othersResolved.map(({ otherProfile }) => otherProfile.id);
  const edges = await db
    .select({
      id: follows.id,
      fromId: follows.fromId,
      toId: follows.toId,
    })
    .from(follows)
    .where(
      or(
        and(
          eq(follows.fromId, actorProfile.id),
          inArray(follows.toId, otherIds),
        ),
        and(
          inArray(follows.fromId, otherIds),
          eq(follows.toId, actorProfile.id),
        ),
      ),
    );
  const followingByToId = new Map<string, string>();
  const followedByFromId = new Map<string, string>();
  for (const edge of edges) {
    if (edge.fromId === actorProfile.id)
      followingByToId.set(edge.toId, edge.id);
    if (edge.toId === actorProfile.id)
      followedByFromId.set(edge.fromId, edge.id);
  }
  const relationships = othersResolved.map(({ otherView, otherProfile }) => ({
    did: otherView.did,
    following: followingByToId.has(otherProfile.id)
      ? `at://${view.did}/app.bsky.graph.follow/${followingByToId.get(otherProfile.id)}`
      : undefined,
    followedBy: followedByFromId.has(otherProfile.id)
      ? `at://${otherView.did}/app.bsky.graph.follow/${followedByFromId.get(otherProfile.id)}`
      : undefined,
  }));
  return { relationships };
};
