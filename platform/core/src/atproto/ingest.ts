import { and, eq, isNull, or } from 'drizzle-orm';
import { createHash } from 'node:crypto';
import { uuidv7 } from 'uuidv7';
import type { PostWithMeta, ProfileWithMeta } from '@openpeepshq/common/types';
import { pgDb } from '../db/pg/client';
import { nowIso } from '../db/pg/mappers';
import { posts, profiles } from '../db/pg/schema/documents';
import { atRecords } from '../db/pg/schema/documents';
import { config } from '../config';
import { findProfile } from '../profiles/finders';
import { follow, unfollow } from '../profiles/mutations';
import { createPost, reactToPost, retractReaction } from '../posts/mutations';
import { AP_LIKE_REACTION } from '@openpeepshq/common/lib';
import { hostnameOf, pdsHostAllowed, canIngestFrom } from './peers';
import {
  COLLECTIONS,
  feedPostReplyParent,
  feedPostText,
  parseAtUri,
} from './records';
import { sanitizeAtHandleLabel } from './identity';
import { logger } from '../log';

const log = logger('app:atproto:ingest');

export type RemoteAtActorInput = {
  did: string;
  handle?: string;
  pdsEndpoint: string;
  displayName?: string;
  bio?: string;
  avatar?: string;
};

export const findProfileByDid = async (
  did: string,
): Promise<ProfileWithMeta | undefined> => {
  const db = pgDb();
  const [row] = await db
    .select({ id: profiles.id })
    .from(profiles)
    .where(and(eq(profiles.did, did), isNull(profiles.deletedAt)))
    .limit(1);
  if (!row) return undefined;
  return findProfile(row.id);
};

const sha256 = (value: string) => createHash('sha256').update(value).digest();

const samePdsEndpoint = (
  existing: string | null | undefined,
  incoming: string,
) =>
  existing === null ||
  existing === undefined ||
  existing === '' ||
  existing === incoming;

export const upsertRemoteAtActor = async (
  input: RemoteAtActorInput,
): Promise<ProfileWithMeta | undefined> => {
  const cfg = await config();
  const host = hostnameOf(input.pdsEndpoint) ?? 'unknown.invalid';

  // Apply the ingest guard: DID-doc PDS match + allowlist + domain check
  const guard = await canIngestFrom(
    input.did,
    input.pdsEndpoint,
    host,
    cfg.atproto.handleDomain,
  );
  if (!guard.allowed) {
    log.warn({ did: input.did, reason: guard.reason }, 'ingest guard rejected');
    return undefined;
  }

  const existing = await findProfileByDid(input.did);
  if (existing) {
    // The same DID re-presenting itself is a re-ingest of an actor we
    // already know — resolve the existing profile so every op for a known
    // remote actor applies, not just the first one (posts, likes, follows
    // all re-resolve the actor through this function). Reject only a
    // genuine re-bind attempt: the same DID now claiming a different PDS
    // than the one the profile is bound to (a null/unknown stored endpoint
    // is treated as unverified and allowed through).
    if (!samePdsEndpoint(existing.pdsEndpoint, input.pdsEndpoint)) {
      log.warn(
        {
          did: input.did,
          profileId: existing.id,
          storedEndpoint: existing.pdsEndpoint,
          incomingEndpoint: input.pdsEndpoint,
        },
        'DID already bound to an existing profile on a different PDS — rejecting ingest',
      );
      return undefined;
    }
    return existing;
  }

  // The AT-handle namespace is shared with locally minted identities, and a
  // hostile remote handle must not break ingest of a whole commit batch —
  // derive a collision-free handle instead of failing the insert. The
  // suffix chain is seeded from the DID and advances deterministically, so
  // the loop always terminates (no random retries that can still collide
  // after 5 attempts and crash the commit on the unique index).
  const preferred = sanitizeAtHandleLabel(
    input.handle?.split('.')[0] ?? input.did.slice(-8),
  );
  const db = pgDb();
  let handle = preferred;
  let atHandle = `${handle}.${host}`;
  let suffixSeed = input.did;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const [clash] = await db
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(
          or(
            and(
              eq(profiles.handle, handle),
              eq(profiles.activityPubDomain, host),
            ),
            eq(profiles.atHandle, atHandle),
          ),
          isNull(profiles.deletedAt),
        ),
      )
      .limit(1);
    if (!clash) break;
    suffixSeed = `${suffixSeed}:${attempt}`;
    const suffix = sha256(suffixSeed).toString('hex').slice(0, 6);
    handle = `${preferred}-${suffix}`;
    atHandle = `${handle}.${host}`;
  }

  const id = uuidv7();
  await db.insert(profiles).values({
    id,
    handle,
    type: 'federated',
    did: input.did,
    atHandle,
    pdsEndpoint: input.pdsEndpoint,
    fetchedAt: nowIso(),
    body: {
      displayName: input.displayName,
      bio: input.bio,
      // Remote profile avatars are at:// blob refs the local UI cannot
      // render; keep them under `atAvatar` so the AT AppView (which maps
      // `body.avatar ?? body.atAvatar`) surfaces them without polluting
      // local profile rendering.
      ...(input.avatar ? { atAvatar: input.avatar } : {}),
    },
  });
  return findProfileByDid(input.did);
};

// Ingested-record tracking: a firehose commit is at-least-once, so a like or
// follow can arrive more than once (or with its delete reordered against the
// create). The delete op must be able to find the applied row to retract it,
// and a replayed create must be a no-op, so every applied like/follow records
// its remote (collection, rkey) in `at_records` keyed by the actor's real
// DID. The tracking row and any repo record share that (did, collection,
// rkey), so retraction tombstones both at once.
const retractLike = async (post: PostWithMeta, actor: ProfileWithMeta) => {
  await retractReaction(post, actor);
};

const trackIngestedLike = async (
  did: string,
  actorId: string,
  postId: string,
  rkey: string,
) => {
  await pgDb()
    .insert(atRecords)
    .values({
      id: uuidv7(),
      // Ingest-tracking rows do not live in the actor's repo (no signed
      // record); the DID and CID are placeholders so the NOT NULL columns
      // stay filled. The row's only job is (did, collection, rkey) dedup +
      // delete lookup, which is why it shares the actor's real DID.
      did,
      cid: `${postId}:${rkey}`,
      rev: rkey,
      collection: COLLECTIONS.like,
      rkey,
      postId,
      profileId: actorId,
    })
    .onConflictDoNothing();
};

const trackIngestedFollow = async (
  did: string,
  followerId: string,
  followedId: string,
  rkey: string,
) => {
  await pgDb()
    .insert(atRecords)
    .values({
      id: uuidv7(),
      did,
      cid: `${followedId}:${rkey}`,
      rev: rkey,
      collection: COLLECTIONS.follow,
      rkey,
      profileId: followerId,
      followId: followedId,
    })
    .onConflictDoNothing();
};

const findIngestedFollowByRkey = async (did: string, rkey: string) => {
  const db = pgDb();
  const [row] = await db
    .select({ followId: atRecords.followId })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.did, did),
        eq(atRecords.collection, COLLECTIONS.follow),
        eq(atRecords.rkey, rkey),
        isNull(atRecords.deletedAt),
      ),
    )
    .limit(1);
  return row?.followId ? { followedId: row.followId } : null;
};

const findIngestedLikePostByRkey = async (
  did: string,
  rkey: string,
): Promise<{ postId: string } | null> => {
  const db = pgDb();
  const [row] = await db
    .select({ postId: atRecords.postId })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.did, did),
        eq(atRecords.collection, COLLECTIONS.like),
        eq(atRecords.rkey, rkey),
        isNull(atRecords.deletedAt),
      ),
    )
    .limit(1);
  return row?.postId ? { postId: row.postId } : null;
};

const hasActiveIngestLike = async (
  actorId: string,
  postId: string,
): Promise<boolean> => {
  const db = pgDb();
  const [row] = await db
    .select({ id: atRecords.id })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.profileId, actorId),
        eq(atRecords.postId, postId),
        eq(atRecords.collection, COLLECTIONS.like),
        isNull(atRecords.deletedAt),
      ),
    )
    .limit(1);
  return !!row;
};

const hasActiveIngestFollow = async (
  followerId: string,
  followedId: string,
): Promise<boolean> => {
  const db = pgDb();
  const [row] = await db
    .select({ id: atRecords.id })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.profileId, followerId),
        eq(atRecords.followId, followedId),
        eq(atRecords.collection, COLLECTIONS.follow),
        isNull(atRecords.deletedAt),
      ),
    )
    .limit(1);
  return !!row;
};

const markIngestedRecordDeleted = async (
  did: string,
  collection: string,
  rkey: string,
) => {
  // Tombstone the tracked row for this record. For posts that is the real
  // repo row; for like/follow it is the ingest-tracking row (the local
  // reaction/follow edge is retracted separately, keyed by the applied row).
  const db = pgDb();
  await db
    .update(atRecords)
    .set({ deletedAt: nowIso(), updatedAt: nowIso() })
    .where(
      and(
        eq(atRecords.did, did),
        eq(atRecords.collection, collection),
        eq(atRecords.rkey, rkey),
        isNull(atRecords.deletedAt),
      ),
    );
};

export const findPostIdByAtUri = async (atUri: string) => {
  const db = pgDb();
  const [row] = await db
    .select({ id: posts.id })
    .from(posts)
    .where(and(eq(posts.atUri, atUri), isNull(posts.deletedAt)))
    .limit(1);
  return row?.id ?? null;
};

export const ingestFeedPost = async (input: {
  uri: string;
  cid: string;
  record: unknown;
  actor: RemoteAtActorInput;
}) => {
  const parsed = parseAtUri(input.uri);
  if (!parsed || parsed.collection !== COLLECTIONS.post) return null;
  const existingId = await findPostIdByAtUri(input.uri);
  if (existingId) {
    // An `update` op re-delivers the same uri with a new record (and a
    // changed CID): apply the edit instead of dropping it behind the
    // "already ingested" guard. A create replay carries the old record,
    // which re-applies the same text — a no-op — so this is safe for
    // at-least-once delivery.
    await applyPostUpdate({ ...input, postId: existingId });
    return input.uri;
  }

  const actor = await upsertRemoteAtActor(input.actor);
  if (!actor) return null;

  const parentUri = feedPostReplyParent(input.record);
  const inReplyToId = parentUri ? await findPostIdByAtUri(parentUri) : null;
  const post = await createPost(
    { type: 'note', content: feedPostText(input.record) },
    actor,
    { type: 'note', visibility: 'public', creatorId: actor.id },
    inReplyToId ? { inReplyToId } : {},
  );
  const db = pgDb();
  await db
    .update(posts)
    .set({ atUri: input.uri, cid: input.cid })
    .where(eq(posts.id, post.id));
  return input.uri;
};

// A remote edit only reaches the projection while the post is public
// (private records must not resurface through the firehose). The edit goes
// through `updatePost`, which emits `postUpdated` — the projection listener
// re-projects the AT record — while the `cid` on the posts row is refreshed
// so the local store agrees with the remote record identity.
const applyPostUpdate = async (input: {
  uri: string;
  cid: string;
  record: unknown;
  actor: RemoteAtActorInput;
  postId: string;
}) => {
  const { findPost } = await import('../posts/finders');
  const post = await findPost(input.postId);
  if (!post || post.visibility !== 'public') return;
  const actor = await upsertRemoteAtActor(input.actor);
  if (!actor) return;
  const { updatePost } = await import('../posts/mutations');
  await updatePost(post, actor, {
    type: 'note',
    content: feedPostText(input.record),
  });
  await pgDb()
    .update(posts)
    .set({ cid: input.cid })
    .where(eq(posts.id, post.id));
};

export const ingestFollow = async (input: {
  actorDid: string;
  subjectDid: string;
  actor: RemoteAtActorInput;
  followRkey?: string;
}) => {
  const actor = await upsertRemoteAtActor(input.actor);
  const subjectId = (
    await pgDb()
      .select({ id: profiles.id })
      .from(profiles)
      .where(
        and(eq(profiles.did, input.subjectDid), isNull(profiles.deletedAt)),
      )
      .limit(1)
  )[0]?.id;
  if (!actor || !subjectId) return null;
  const subject = await findProfile(subjectId);
  if (!subject) return null;
  await follow(actor, subject, { reblogs: true, notify: true });
  if (input.followRkey)
    await trackIngestedFollow(
      input.actorDid,
      actor.id,
      subjectId,
      input.followRkey,
    );
  return actor.id;
};

export const ingestLike = async (input: {
  actor: RemoteAtActorInput;
  subjectUri: string;
  likeRkey?: string;
}) => {
  const actor = await upsertRemoteAtActor(input.actor);
  const postId = await findPostIdByAtUri(input.subjectUri);
  if (!actor || !postId) return null;
  const { findPost } = await import('../posts/finders');
  const post = await findPost(postId);
  if (!post) return null;
  await reactToPost(post, actor, { reaction: AP_LIKE_REACTION });
  if (input.likeRkey)
    await trackIngestedLike(input.actor.did, actor.id, postId, input.likeRkey);
  return postId;
};

export const ingestCommitOps = async (input: {
  did: string;
  pdsEndpoint: string;
  handle?: string;
  ops: {
    action: 'create' | 'update' | 'delete';
    path: string;
    cid?: string;
    record?: unknown;
  }[];
}) => {
  if (!(await pdsHostAllowed(input.pdsEndpoint))) return [];
  const { findPost } = await import('../posts/finders');
  const ingested: string[] = [];
  // The actor is resolved lazily (and cached for the batch) instead of
  // upfront: an actor's very first commit — what a freshly allowlisted PDS
  // delivers after a cursor reset — creates the profile with its own post
  // or profile op, so a like/follow op later in the same batch must not be
  // skipped just because the profile did not exist at entry.
  let actor: ProfileWithMeta | undefined;
  let actorResolved = false;
  const resolveActor = async (): Promise<ProfileWithMeta | undefined> => {
    if (!actorResolved) {
      actorResolved = true;
      actor = await findProfileByDid(input.did);
    }
    return actor;
  };
  for (const op of input.ops) {
    const [collection, rkey] = op.path.split('/');
    if (!collection || !rkey) continue;
    const uri = `at://${input.did}/${collection}/${rkey}`;
    if (op.action === 'delete') {
      // Capture the applied ids from the tracking rows BEFORE tombstoning
      // (the retract lookups below filter on isNull(deletedAt)).
      const likeRow =
        collection === COLLECTIONS.like
          ? await findIngestedLikePostByRkey(input.did, rkey)
          : null;
      const followRow =
        collection === COLLECTIONS.follow
          ? await findIngestedFollowByRkey(input.did, rkey)
          : null;
      if (collection === COLLECTIONS.post) {
        // Soft-delete rows are filtered by the isNull(deletedAt) guard, so a
        // re-delivered delete (post already gone) is a no-op.
        const postId = await findPostIdByAtUri(uri);
        if (postId) {
          // Also clear the tombstoned row's atUri so a replayed create for
          // the same (did, rkey) does not collide on the unique posts_at_uri
          // index after the row's soft-delete is lifted.
          await pgDb()
            .update(posts)
            .set({ deletedAt: nowIso(), atUri: null, cid: null })
            .where(eq(posts.id, postId));
          ingested.push(uri);
        }
      }
      // Tombstone the tracked row so a same-batch or replayed create for
      // this (did, rkey) is dropped (the create branches check the live
      // tracking row). For a post that is the real repo row; for a
      // like/follow it is the ingest-tracking row.
      await markIngestedRecordDeleted(input.did, collection, rkey);
      if (collection === COLLECTIONS.like) {
        // Retract by the applied (actor, post) pair the tracking row
        // recorded. The like's atUri is not stored in posts.atUri (only
        // feed posts are), so the post id comes from the tracking row.
        const actor = await resolveActor();
        if (actor && likeRow) {
          const stored = await findPost(likeRow.postId);
          if (stored) await retractLike(stored, actor);
        }
      } else if (collection === COLLECTIONS.follow) {
        const actor = await resolveActor();
        if (actor && followRow) {
          const subject = await findProfile(followRow.followedId);
          if (subject) await unfollow(actor, subject);
        }
      }
      continue;
    }
    if (collection === COLLECTIONS.post && op.record) {
      const result = await ingestFeedPost({
        uri,
        cid: op.cid ?? '',
        record: op.record,
        actor: {
          did: input.did,
          handle: input.handle,
          pdsEndpoint: input.pdsEndpoint,
        },
      });
      if (result) {
        ingested.push(result);
        // The create may have minted the actor's profile; re-resolve on the
        // next op instead of reusing the (stale) entry-time lookup.
        actorResolved = false;
      }
    }
    if (collection === COLLECTIONS.follow && op.record) {
      const actor = await resolveActor();
      const subject = (op.record as { subject?: string }).subject;
      if (actor && typeof subject === 'string') {
        // A replayed follow create (or a create that lands after its own
        // delete) is a no-op: the edge exists only while the tracking row is
        // live, and the tombstone above retires it.
        const subjectProfile =
          (
            await pgDb()
              .select({ id: profiles.id })
              .from(profiles)
              .where(and(eq(profiles.did, subject), isNull(profiles.deletedAt)))
              .limit(1)
          )[0] ?? null;
        if (
          subjectProfile &&
          !(await hasActiveIngestFollow(actor.id, subjectProfile.id))
        ) {
          await ingestFollow({
            actorDid: input.did,
            subjectDid: subject,
            actor: {
              did: input.did,
              handle: input.handle,
              pdsEndpoint: input.pdsEndpoint,
            },
            followRkey: rkey,
          });
        }
      }
    }
    if (collection === COLLECTIONS.like && op.record) {
      const actor = await resolveActor();
      const subject = (op.record as { subject?: { uri?: string } }).subject;
      if (actor && typeof subject?.uri === 'string') {
        const postId = await findPostIdByAtUri(subject.uri);
        if (postId && !(await hasActiveIngestLike(actor.id, postId))) {
          await ingestLike({
            actor: {
              did: input.did,
              handle: input.handle,
              pdsEndpoint: input.pdsEndpoint,
            },
            subjectUri: subject.uri,
            likeRkey: rkey,
          });
        }
      }
    }
    if (collection === COLLECTIONS.profile && op.record) {
      // The actor's identity surface (displayName/description/avatar):
      // feed it into the upsert, which creates the profile for a first
      // commit and merges it into an existing one.
      const record = op.record as {
        displayName?: unknown;
        description?: unknown;
        avatar?: unknown;
      };
      await upsertRemoteAtActor({
        did: input.did,
        handle: input.handle,
        pdsEndpoint: input.pdsEndpoint,
        displayName:
          typeof record.displayName === 'string'
            ? record.displayName
            : undefined,
        bio:
          typeof record.description === 'string'
            ? record.description
            : undefined,
        avatar: typeof record.avatar === 'string' ? record.avatar : undefined,
      });
      actorResolved = false;
    }
  }
  return ingested;
};
