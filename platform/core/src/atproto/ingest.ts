import { and, eq, isNull } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { ProfileWithMeta } from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { pgDb } from '../db/pg/client';
import { nowIso } from '../db/pg/mappers';
import { posts, profiles } from '../db/pg/schema/documents';
import { profilesMapping } from '../profiles/mapping';
import { findProfile } from '../profiles/finders';
import { follow, unfollow } from '../profiles/mutations';
import { createPost, reactToPost } from '../posts/mutations';
import { AP_LIKE_REACTION } from '@openpeepshq/common/lib';
import { hostnameOf, pdsHostAllowed } from './peers';
import {
  COLLECTIONS,
  feedPostReplyParent,
  feedPostText,
  parseAtUri,
} from './records';
import { sanitizeAtHandleLabel } from './identity';

export type RemoteAtActorInput = {
  did: string;
  handle?: string;
  pdsEndpoint: string;
  displayName?: string;
  bio?: string;
};

export const findProfileByDid = async (
  did: string,
): Promise<ProfileWithMeta | undefined> => {
  const { db } = await allpeepDb();
  return profilesMapping.findOneBy(db, { matches: { did } });
};

export const upsertRemoteAtActor = async (
  input: RemoteAtActorInput,
): Promise<ProfileWithMeta | undefined> => {
  if (!(await pdsHostAllowed(input.pdsEndpoint))) return undefined;
  const existing = await findProfileByDid(input.did);
  const db = pgDb();
  const host = hostnameOf(input.pdsEndpoint) ?? 'unknown.invalid';
  if (existing) {
    await db
      .update(profiles)
      .set({
        pdsEndpoint: input.pdsEndpoint,
        fetchedAt: nowIso(),
      })
      .where(eq(profiles.id, existing.id));
    return findProfileByDid(input.did);
  }
  const preferred = sanitizeAtHandleLabel(
    input.handle?.split('.')[0] ?? input.did.slice(-8),
  );
  const id = uuidv7();
  await profilesMapping.create(await allpeepDb().then((d) => d.db), {
    id,
    handle: preferred,
    type: 'federated',
    displayName: input.displayName,
    bio: input.bio,
  });
  await db
    .update(profiles)
    .set({
      did: input.did,
      atHandle: input.handle ?? `${preferred}.${host}`,
      pdsEndpoint: input.pdsEndpoint,
      fetchedAt: nowIso(),
    })
    .where(eq(profiles.id, id));
  return findProfileByDid(input.did);
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
  if (await findPostIdByAtUri(input.uri)) return input.uri;

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

export const ingestFollow = async (input: {
  actorDid: string;
  subjectDid: string;
  actor: RemoteAtActorInput;
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
  return actor.id;
};

export const ingestUnfollow = async (actorDid: string, subjectDid: string) => {
  const actor = await findProfileByDid(actorDid);
  const subject = await findProfileByDid(subjectDid);
  if (!actor || !subject) return;
  await unfollow(actor, subject);
};

export const ingestLike = async (input: {
  actor: RemoteAtActorInput;
  subjectUri: string;
}) => {
  const actor = await upsertRemoteAtActor(input.actor);
  const postId = await findPostIdByAtUri(input.subjectUri);
  if (!actor || !postId) return null;
  const { findPost } = await import('../posts/finders');
  const post = await findPost(postId);
  if (!post) return null;
  await reactToPost(post, actor, { reaction: AP_LIKE_REACTION });
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
  const ingested: string[] = [];
  for (const op of input.ops) {
    const [collection, rkey] = op.path.split('/');
    if (!collection || !rkey) continue;
    const uri = `at://${input.did}/${collection}/${rkey}`;
    if (op.action === 'delete') {
      if (collection === COLLECTIONS.post) {
        const postId = await findPostIdByAtUri(uri);
        if (postId) {
          await pgDb()
            .update(posts)
            .set({ deletedAt: nowIso() })
            .where(eq(posts.id, postId));
          ingested.push(uri);
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
      if (result) ingested.push(result);
    }
    if (collection === COLLECTIONS.follow && op.record) {
      const subject = (op.record as { subject?: string }).subject;
      if (typeof subject === 'string') {
        await ingestFollow({
          actorDid: input.did,
          subjectDid: subject,
          actor: {
            did: input.did,
            handle: input.handle,
            pdsEndpoint: input.pdsEndpoint,
          },
        });
      }
    }
    if (collection === COLLECTIONS.like && op.record) {
      const subject = (op.record as { subject?: { uri?: string } }).subject;
      if (typeof subject?.uri === 'string') {
        await ingestLike({
          actor: {
            did: input.did,
            handle: input.handle,
            pdsEndpoint: input.pdsEndpoint,
          },
          subjectUri: subject.uri,
        });
      }
    }
  }
  return ingested;
};
