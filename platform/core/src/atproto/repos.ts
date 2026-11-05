import { and, desc, eq, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { PostWithMeta, Profile } from '@openpeepshq/common/types';
import { pgDb } from '../db/pg/client';
import { nowIso } from '../db/pg/mappers';
import {
  atRecords,
  atRepoCommits,
  posts,
  profiles,
} from '../db/pg/schema/documents';
import { config } from '../config';
import {
  loadLocalAtprotoIdentity,
  localAtprotoScalars,
  warmHandleWellKnown,
} from './identity';
import { enqueueHandleTxt } from './jobs';
import { handleDnsConfigured } from './handleDns';
import { buildSignedRepoCar } from './car';
import {
  COLLECTIONS,
  atUriFor,
  cidForRecord,
  followToGraphFollow,
  isDesignatedLike,
  isProjectablePublicNote,
  likeToFeedLike,
  nextRkey,
  parseAtUri,
  postToFeedPost,
  profileToActorProfile,
  rkeyFromPostId,
} from './records';
import type { RepoRecord } from '@atproto/lexicon';

export type AtRecordRow = {
  did: string;
  collection: string;
  rkey: string;
  cid: string;
  rev: string;
  record: unknown;
  postId?: string | null;
  profileId?: string | null;
};

export type LocalRepoCommit = {
  did: string;
  rev: string;
  commitCid: string;
  prev?: string | null;
  car: Uint8Array;
  ops: {
    action: 'create' | 'update' | 'delete';
    path: string;
    cid?: string | null;
  }[];
};

type RepoListener = (event: LocalRepoCommit) => void;

const listeners = new Set<RepoListener>();

export const onLocalRepoCommit = (fn: RepoListener) => {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
};

const emitCommit = (event: Parameters<RepoListener>[0]) => {
  for (const listener of listeners) listener(event);
};

const nextRev = () => nextRkey();

const writeRecord = async (input: {
  did: string;
  collection: string;
  rkey: string;
  record: Record<string, unknown>;
  postId?: string | null;
  profileId?: string | null;
  followId?: string | null;
}) => {
  const db = pgDb();
  const cid = await cidForRecord(input.record);
  const rev = nextRev();
  const now = nowIso();
  await db
    .insert(atRecords)
    .values({
      id: uuidv7(),
      did: input.did,
      collection: input.collection,
      rkey: input.rkey,
      cid,
      rev,
      record: input.record,
      postId: input.postId ?? null,
      profileId: input.profileId ?? null,
      followId: input.followId ?? null,
      createdAt: now,
      updatedAt: now,
    })
    .onConflictDoUpdate({
      target: [atRecords.did, atRecords.collection, atRecords.rkey],
      set: {
        cid,
        rev,
        record: input.record,
        postId: input.postId ?? null,
        updatedAt: now,
        deletedAt: null,
      },
    });
  await snapshotRepo(input.did, rev, [
    {
      action: 'create',
      path: `${input.collection}/${input.rkey}`,
      cid,
    },
  ]);
  return { cid, rev, uri: atUriFor(input.did, input.collection, input.rkey) };
};

const signingKeyForDid = async (did: string) => {
  const identity = await loadLocalAtprotoIdentity(did);
  if (!identity) {
    throw new Error(`No AT signing key for ${did}`);
  }
  return identity.privateKey;
};

const snapshotRepo = async (
  did: string,
  rev: string,
  ops: LocalRepoCommit['ops'],
) => {
  const db = pgDb();
  const records = await db
    .select({
      collection: atRecords.collection,
      rkey: atRecords.rkey,
      record: atRecords.record,
    })
    .from(atRecords)
    .where(and(eq(atRecords.did, did), isNull(atRecords.deletedAt)));
  const previous = await getLatestCommit(did);
  const built = await buildSignedRepoCar({
    did,
    privateKey: await signingKeyForDid(did),
    records: records.map((row) => ({
      collection: row.collection,
      rkey: row.rkey,
      record: row.record as RepoRecord,
    })),
  });
  await db.insert(atRepoCommits).values({
    id: uuidv7(),
    did,
    rev: built.rev || rev,
    commitCid: built.commitCid,
    prev: previous?.cid ?? built.prev,
    car: Buffer.from(built.car),
    snapshot: { ops },
    createdAt: nowIso(),
    updatedAt: nowIso(),
  });
  emitCommit({
    did,
    rev: built.rev || rev,
    commitCid: built.commitCid,
    prev: previous?.cid ?? built.prev,
    car: built.car,
    ops,
  });
  return built.commitCid;
};

export const ensureLocalIdentity = async (profile: Profile) => {
  if (profile.type !== 'local') return null;
  const existing = await loadLocalAtprotoIdentity(profile.handle);
  if (existing) return existing;
  const domain = (await config()).atproto.handleDomain;
  const scalars = await localAtprotoScalars(profile.handle, domain);
  const db = pgDb();
  await db.update(profiles).set(scalars).where(eq(profiles.id, profile.id));
  const identity = await loadLocalAtprotoIdentity(profile.handle);
  if (identity) {
    if (await handleDnsConfigured()) {
      await enqueueHandleTxt({
        atHandle: identity.atHandle,
        did: identity.did,
      });
    } else {
      warmHandleWellKnown(identity.atHandle, domain);
    }
  }
  return identity;
};

export const projectProfile = async (profile: Profile) => {
  const identity = await ensureLocalIdentity(profile);
  if (!identity) return null;
  return writeRecord({
    did: identity.did,
    collection: COLLECTIONS.profile,
    rkey: 'self',
    record: profileToActorProfile(profile),
    profileId: profile.id,
  });
};

export const projectPublicNote = async (post: PostWithMeta) => {
  if (!isProjectablePublicNote(post)) return null;
  const db = pgDb();
  const [creator] = await db
    .select({
      id: profiles.id,
      handle: profiles.handle,
      type: profiles.type,
      did: profiles.did,
    })
    .from(profiles)
    .where(eq(profiles.id, post.creatorId))
    .limit(1);
  if (!creator || creator.type !== 'local') return null;
  const identity = await loadLocalAtprotoIdentity(creator.handle);
  if (!identity) return null;

  const rkey = rkeyFromPostId(post.id);
  let reply:
    | {
        root: { uri: string; cid: string };
        parent: { uri: string; cid: string };
      }
    | undefined;
  if (post.inReplyToId) {
    const [parent] = await db
      .select({ atUri: posts.atUri, cid: posts.cid })
      .from(posts)
      .where(eq(posts.id, post.inReplyToId))
      .limit(1);
    if (parent?.atUri && parent.cid) {
      const ref = { uri: parent.atUri, cid: parent.cid };
      reply = { root: ref, parent: ref };
    }
  }
  const record = postToFeedPost(post, post.createdAt, reply);
  const written = await writeRecord({
    did: identity.did,
    collection: COLLECTIONS.post,
    rkey,
    record,
    postId: post.id,
  });
  await db
    .update(posts)
    .set({ atUri: written.uri, cid: written.cid })
    .where(eq(posts.id, post.id));
  return written;
};

export const projectFollow = async (follower: Profile, followed: Profile) => {
  const followerIdentity = await ensureLocalIdentity(follower);
  const followedDid =
    (followed as { did?: string | null }).did ??
    (await loadLocalAtprotoIdentity(followed.handle))?.did;
  if (!followerIdentity || !followedDid) return null;
  return writeRecord({
    did: followerIdentity.did,
    collection: COLLECTIONS.follow,
    rkey: nextRkey(),
    record: followToGraphFollow(followedDid, new Date().toISOString()),
    profileId: follower.id,
  });
};

export const projectLike = async (
  profile: Profile,
  post: PostWithMeta,
  reaction: string,
) => {
  if (!isDesignatedLike(reaction) || !post.atUri) return null;
  const identity = await ensureLocalIdentity(profile);
  if (!identity) return null;
  return writeRecord({
    did: identity.did,
    collection: COLLECTIONS.like,
    rkey: nextRkey(),
    record: likeToFeedLike(
      { uri: post.atUri, cid: post.cid ?? '' },
      new Date().toISOString(),
    ),
    postId: post.id,
    profileId: profile.id,
  });
};

export const deleteProjectedRecord = async (
  did: string,
  collection: string,
  rkey: string,
) => {
  const db = pgDb();
  await db
    .update(atRecords)
    .set({ deletedAt: nowIso(), updatedAt: nowIso() })
    .where(
      and(
        eq(atRecords.did, did),
        eq(atRecords.collection, collection),
        eq(atRecords.rkey, rkey),
      ),
    );
  const rev = nextRev();
  await snapshotRepo(did, rev, [
    { action: 'delete', path: `${collection}/${rkey}`, cid: null },
  ]);
};

export const deleteProjectedPost = async (post: { atUri?: string | null }) => {
  const parsed = post.atUri ? parseAtUri(post.atUri) : null;
  if (!parsed) return null;
  await deleteProjectedRecord(parsed.did, parsed.collection, parsed.rkey);
  return parsed;
};

export const getRecord = async (
  repo: string,
  collection: string,
  rkey: string,
) => {
  const identity = await loadLocalAtprotoIdentity(repo);
  const did = identity?.did ?? (repo.startsWith('did:') ? repo : null);
  if (!did) return null;
  const db = pgDb();
  const [row] = await db
    .select()
    .from(atRecords)
    .where(
      and(
        eq(atRecords.did, did),
        eq(atRecords.collection, collection),
        eq(atRecords.rkey, rkey),
        isNull(atRecords.deletedAt),
      ),
    )
    .limit(1);
  if (!row) return null;
  return {
    uri: atUriFor(did, collection, rkey),
    cid: row.cid,
    value: row.record,
  };
};

export const listRecords = async (
  repo: string,
  collection: string,
  limit = 50,
  cursor?: string,
) => {
  const identity = await loadLocalAtprotoIdentity(repo);
  const did = identity?.did ?? (repo.startsWith('did:') ? repo : null);
  if (!did) return { records: [], cursor: undefined };
  const db = pgDb();
  const rows = await db
    .select()
    .from(atRecords)
    .where(
      and(
        eq(atRecords.did, did),
        eq(atRecords.collection, collection),
        isNull(atRecords.deletedAt),
        cursor ? sql`${atRecords.rkey} < ${cursor}` : undefined,
      ),
    )
    .orderBy(desc(atRecords.rkey))
    .limit(Math.min(limit, 100));
  return {
    records: rows.map((row) => ({
      uri: atUriFor(did, row.collection, row.rkey),
      cid: row.cid,
      value: row.record,
    })),
    cursor: rows.at(-1)?.rkey,
  };
};

export const describeRepo = async (repo: string) => {
  const identity = await loadLocalAtprotoIdentity(repo);
  const did = identity?.did ?? (repo.startsWith('did:') ? repo : null);
  if (!did) return null;
  const handle = identity?.atHandle;
  const db = pgDb();
  const collections = await db
    .selectDistinct({ collection: atRecords.collection })
    .from(atRecords)
    .where(and(eq(atRecords.did, did), isNull(atRecords.deletedAt)));
  return {
    handle: handle ?? repo,
    did,
    collections: collections.map((row) => row.collection),
  };
};

export const getLatestCommit = async (did: string) => {
  const db = pgDb();
  const [row] = await db
    .select()
    .from(atRepoCommits)
    .where(eq(atRepoCommits.did, did))
    .orderBy(desc(atRepoCommits.createdAt))
    .limit(1);
  if (!row) return null;
  return { cid: row.commitCid, rev: row.rev };
};

export const listRepos = async (limit = 50, cursor?: string) => {
  const db = pgDb();
  const rows = await db
    .select({
      did: atRepoCommits.did,
      rev: atRepoCommits.rev,
      commitCid: atRepoCommits.commitCid,
      createdAt: atRepoCommits.createdAt,
    })
    .from(atRepoCommits)
    .where(cursor ? sql`${atRepoCommits.did} > ${cursor}` : undefined)
    .orderBy(atRepoCommits.did)
    .limit(Math.min(limit, 100));
  const latest = new Map<string, (typeof rows)[number]>();
  for (const row of rows) {
    if (!latest.has(row.did)) latest.set(row.did, row);
  }
  const repos = [...latest.values()].map((row) => ({
    did: row.did,
    head: row.commitCid,
    rev: row.rev,
  }));
  return { repos, cursor: repos.at(-1)?.did };
};

export const getRepoSnapshot = async (did: string) => {
  const db = pgDb();
  const [row] = await db
    .select()
    .from(atRepoCommits)
    .where(eq(atRepoCommits.did, did))
    .orderBy(desc(atRepoCommits.createdAt))
    .limit(1);
  return row ?? null;
};

export const getRepoCar = async (did: string) => {
  const row = await getRepoSnapshot(did);
  if (row?.car) {
    return {
      rev: row.rev,
      commitCid: row.commitCid,
      car: new Uint8Array(row.car),
    };
  }
  const identity = await loadLocalAtprotoIdentity(did);
  if (!identity) return null;
  const records = await listRecordsForDid(did);
  if (records.length === 0 && !row) return null;
  const built = await buildSignedRepoCar({
    did: identity.did,
    privateKey: identity.privateKey,
    records: records.map((item) => ({
      collection: item.collection,
      rkey: item.rkey,
      record: item.record as RepoRecord,
    })),
  });
  return {
    rev: built.rev,
    commitCid: built.commitCid,
    car: built.car,
  };
};

export const listRecordsForDid = async (did: string) => {
  const db = pgDb();
  return db
    .select()
    .from(atRecords)
    .where(and(eq(atRecords.did, did), isNull(atRecords.deletedAt)));
};
