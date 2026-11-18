import { and, asc, desc, eq, gt, inArray, isNull, sql } from 'drizzle-orm';
import { uuidv7 } from 'uuidv7';
import type { PostWithMeta, Profile } from '@openpeepshq/common/types';
import type { CID } from 'multiformats/cid';
import { WriteOpAction } from '@atproto/repo';
import type { RecordWriteOp } from '@atproto/repo';
import { queueAndWorker } from '../jobs';
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
import {
  buildSignedRepoCar,
  buildSignedRepoCarIncremental,
  collectCommitBlockCids,
  readRepoBlocks,
  readRepoRootCid,
} from './car';
import type { RepoRecord } from '@atproto/lexicon';
import {
  COLLECTIONS,
  atUriFor,
  cidForRecord,
  embedForPost,
  followToGraphFollow,
  isDesignatedLike,
  isProjectablePublicNote,
  likeToFeedLike,
  nextRkey,
  parseAtUri,
  postToFeedPost,
  profileToActorProfile,
  rkeyFromPostId,
  type StrongRef,
} from './records';
import { storeMediaAttachmentBlob } from './blobs';

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
  id?: string;
  createdAt?: string;
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

const nextRev = () => nextRkey();

// One worker process serves the atproto-project queue (worker/src/index.ts),
// so this in-process per-DID chain keeps same-repo commits applying in rev
// order (FIFO dequeue) without serializing every DID behind the busiest one:
// distinct DIDs rebuild their CARs in parallel, while two commits for one DID
// never race on the same previous CAR and drop each other's records.
//
// This is a single-process assumption: the ordering is only correct while
// exactly one worker serves the queue. Scaling the queue across multiple
// worker processes would silently interleave same-DID commits (two workers
// each read the same previous CAR and drop one other's records), so it
// requires a distributed per-DID lock (e.g. a Postgres advisory lock keyed
// on the DID) around snapshotRepo before the queue can run multi-worker.
const projectChainsByDid = new Map<string, Promise<void>>();

// Runs `fn` behind the last-pending `fn` for the same `key` (ordering), while
// different keys run concurrently. Exposed for unit-testing the ordering
// without a worker or database.
export const serializeByKey = async <T>(
  chains: Map<string, Promise<void>>,
  key: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const prev = chains.get(key) ?? Promise.resolve();
  const run = prev.then(fn);
  chains.set(
    key,
    run.then(
      () => undefined,
      () => undefined,
    ),
  );
  return run;
};

const runProjectJob = (job: AtprotoProjectJob) =>
  serializeByKey(projectChainsByDid, job.did, () => snapshotRepo(job));

const [atprotoProjectQueue, atprotoProjectWorker] = queueAndWorker<
  AtprotoProjectJob,
  string | null
>('atproto-project', (job) => runProjectJob(job.data));

export { atprotoProjectWorker };

export const enqueueAtprotoProject = async (job: AtprotoProjectJob) => {
  await atprotoProjectQueue().add('project', job, {
    jobId: `${job.did}:${job.rev}`,
    removeOnComplete: 100,
    removeOnFail: 200,
  });
};

type AtprotoProjectJob = {
  did: string;
  rev: string;
  ops: LocalRepoCommit['ops'];
};

const writeRecord = async (input: {
  did: string;
  collection: string;
  rkey: string;
  record: Record<string, unknown>;
  postId?: string | null;
  profileId?: string | null;
  followId?: string | null;
  opAction?: 'create' | 'update';
}) => {
  const db = pgDb();
  const cid = await cidForRecord(input.record);
  const rev = nextRev();
  const now = nowIso();
  const opAction = input.opAction ?? 'create';
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
  await enqueueAtprotoProject({
    did: input.did,
    rev,
    ops: [
      {
        action: opAction,
        path: `${input.collection}/${input.rkey}`,
        cid,
      },
    ],
  });
  return { cid, rev, uri: atUriFor(input.did, input.collection, input.rkey) };
};

const signingKeyForDid = async (did: string) => {
  const identity = await loadLocalAtprotoIdentity(did);
  if (!identity) {
    throw new Error(`No AT signing key for ${did}`);
  }
  return identity.privateKey;
};

const snapshotRepo = async (job: AtprotoProjectJob) => {
  const { did, rev, ops } = job;
  const db = pgDb();
  const previous = await getRepoSnapshot(did);
  // RecordWriteOp carries the record itself for create/update; ops from the
  // request path only hold the path and CID, so live rows fill the gap.
  const paths = ops.map((op) => op.path);
  const touched = paths.length
    ? await db
        .select()
        .from(atRecords)
        .where(
          and(
            eq(atRecords.did, did),
            isNull(atRecords.deletedAt),
            inArray(atRecords.collection, [
              ...new Set(paths.map((p) => p.split('/')[0])),
            ]),
          ),
        )
    : [];
  const byPath = new Map(
    touched.map((row) => [`${row.collection}/${row.rkey}`, row]),
  );
  const writes: RecordWriteOp[] = [];
  for (const op of ops) {
    const [collection, rkey] = op.path.split('/');
    if (op.action === 'delete') {
      writes.push({ action: WriteOpAction.Delete, collection, rkey });
      continue;
    }
    const record = byPath.get(op.path)?.record as RepoRecord | undefined;
    if (!record) continue;
    writes.push({
      action:
        op.action === 'update' ? WriteOpAction.Update : WriteOpAction.Create,
      collection,
      rkey,
      record,
    });
  }
  if (writes.length === 0) return null;
  const built = previous?.car
    ? await buildSignedRepoCarIncremental({
        did,
        privateKey: await signingKeyForDid(did),
        previousCar: new Uint8Array(previous.car),
        writes,
      })
    : await buildSignedRepoCar({
        did,
        privateKey: await signingKeyForDid(did),
        records: (await listRecordsForDid(did)).map((row) => ({
          collection: row.collection,
          rkey: row.rkey,
          record: row.record as RepoRecord,
        })),
      });
  // The persisted row keeps the FULL block set so a consumer importing the
  // repo never sees dangling CIDs.
  const fullCar =
    'fullCar' in built ? (built as { fullCar: Uint8Array }).fullCar : built.car;
  await db.insert(atRepoCommits).values({
    id: uuidv7(),
    did,
    rev: built.rev || rev,
    commitCid: built.commitCid,
    prev: built.prev,
    car: Buffer.from(fullCar),
    snapshot: { ops },
    createdAt: nowIso(),
    updatedAt: nowIso(),
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

// Public-note media becomes AT blobs so the sync surface (listBlobs/getBlob)
// serves what the projected record references; image attachments are embedded
// app.bsky.embed.images style with their blob CIDs. A note whose attachments
// cannot be stored still projects text-only — blob storage must never block
// the record.
const projectNoteAttachments = async (did: string, post: PostWithMeta) => {
  const attachments = post.data.attachments;
  if (!attachments?.length) return null;
  const images: { alt: string; image: string }[] = [];
  for (const attachment of attachments) {
    const stored = await storeMediaAttachmentBlob(did, attachment);
    if (stored && attachment.type === 'image') {
      images.push({ alt: attachment.description ?? '', image: stored.cid });
    }
  }
  return embedForPost(images.length ? images : null);
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
  const embed = await projectNoteAttachments(identity.did, post);
  const record = postToFeedPost(
    post,
    post.createdAt,
    reply,
    embed ?? undefined,
  );
  // Re-projection (postUpdated on an already-public note) must surface as an
  // `update` op in the commit, not a second create for the same rkey.
  const [existingRecord] = await db
    .select({ id: atRecords.id })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.did, identity.did),
        eq(atRecords.collection, COLLECTIONS.post),
        eq(atRecords.rkey, rkey),
        isNull(atRecords.deletedAt),
      ),
    )
    .limit(1);
  const written = await writeRecord({
    did: identity.did,
    collection: COLLECTIONS.post,
    rkey,
    record,
    postId: post.id,
    opAction: existingRecord ? 'update' : 'create',
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
  if (!isDesignatedLike(reaction) || !post.uri) return null;
  const identity = await ensureLocalIdentity(profile);
  if (!identity) return null;
  // The like record's subject.cid must be the subject post's record CID, not
  // the post row id (S2): posts.cid stores it from the public-note projection.
  const db = pgDb();
  const [subjectPost] = await db
    .select({ cid: posts.cid })
    .from(posts)
    .where(eq(posts.id, post.id))
    .limit(1);
  if (!subjectPost?.cid) return null;
  const subject: StrongRef = { uri: post.uri, cid: subjectPost.cid };
  return writeRecord({
    did: identity.did,
    collection: COLLECTIONS.like,
    rkey: nextRkey(),
    record: likeToFeedLike(subject, new Date().toISOString()),
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
  await enqueueAtprotoProject({
    did,
    rev,
    ops: [{ action: 'delete', path: `${collection}/${rkey}`, cid: null }],
  });
};

export const deleteProjectedPost = async (post: {
  atUri?: string | null;
  uri?: string | null;
}) => {
  const parsed =
    (post.atUri ?? post.uri)
      ? parseAtUri((post.atUri ?? post.uri) as string)
      : null;
  if (!parsed) return null;
  await deleteProjectedRecord(parsed.did, parsed.collection, parsed.rkey);
  return parsed;
};

const latestLikeRkeyForPost = async (did: string, postId: string) => {
  const db = pgDb();
  const [row] = await db
    .select({ rkey: atRecords.rkey })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.did, did),
        eq(atRecords.collection, COLLECTIONS.like),
        eq(atRecords.postId, postId),
        isNull(atRecords.deletedAt),
      ),
    )
    .orderBy(desc(atRecords.createdAt))
    .limit(1);
  return row?.rkey ?? null;
};

const followRkeyBetween = async (did: string, followedDid: string) => {
  const db = pgDb();
  const [row] = await db
    .select({ rkey: atRecords.rkey })
    .from(atRecords)
    .where(
      and(
        eq(atRecords.did, did),
        eq(atRecords.collection, COLLECTIONS.follow),
        // The projected record carries the followed DID as its subject; the
        // row's profileId only records the follower.
        sql`${atRecords.record}->>'subject' = ${followedDid}`,
        isNull(atRecords.deletedAt),
      ),
    )
    .orderBy(desc(atRecords.createdAt))
    .limit(1);
  return row?.rkey ?? null;
};

export const deleteProjectedLike = async (
  profile: Profile,
  post: PostWithMeta,
) => {
  const identity = await loadLocalAtprotoIdentity(profile.handle);
  if (!identity || !post.id) return null;
  const rkey = await latestLikeRkeyForPost(identity.did, post.id);
  if (!rkey) return null;
  await deleteProjectedRecord(identity.did, COLLECTIONS.like, rkey);
  return rkey;
};

export const deleteProjectedFollow = async (
  follower: Profile,
  followed: Profile,
) => {
  const identity = await loadLocalAtprotoIdentity(follower.handle);
  const followedDid = (followed as { did?: string | null }).did;
  if (!identity || !followedDid) return null;
  const rkey = await followRkeyBetween(identity.did, followedDid);
  if (!rkey) return null;
  await deleteProjectedRecord(identity.did, COLLECTIONS.follow, rkey);
  return rkey;
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
  // A record may outlive its source post's visibility (projection happens at
  // creation time); never serve it once the post is no longer public.
  if (
    row.postId &&
    (collection === COLLECTIONS.post || collection === COLLECTIONS.like)
  ) {
    const [post] = await db
      .select({ visibility: posts.visibility, deletedAt: posts.deletedAt })
      .from(posts)
      .where(eq(posts.id, row.postId))
      .limit(1);
    if (!post || post.visibility !== 'public' || post.deletedAt != null) {
      return null;
    }
  }
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
  // Same live-visibility gate as getRecord: a projected post/like record must
  // not stay readable once its source post is no longer public.
  const gated = new Set(
    rows.filter((row) => row.postId).map((row) => row.postId as string),
  );
  const postIds = [...gated];
  const livePosts = new Set(
    postIds.length
      ? (
          await db
            .select({ id: posts.id })
            .from(posts)
            .where(
              and(
                inArray(posts.id, postIds),
                eq(posts.visibility, 'public'),
                isNull(posts.deletedAt),
              ),
            )
        ).map((row) => row.id)
      : [],
  );
  const visible = rows.filter(
    (row) => !row.postId || livePosts.has(row.postId),
  );
  return {
    records: visible.map((row) => ({
      uri: atUriFor(did, row.collection, row.rkey),
      cid: row.cid,
      value: row.record,
    })),
    cursor: visible.at(-1)?.rkey,
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

// Commits after `cursor` (exclusive), oldest first — the persisted stream
// behind subscribeRepos replay. Paging is capped so one cursor window cannot
// flood a reconnecting subscriber; it keeps cursoring until it catches up.
export const listLocalRepoCommits = async (
  cursor: string | null,
  limit = 200,
) => {
  const db = pgDb();
  const rows = await db
    .select()
    .from(atRepoCommits)
    .where(cursor ? gt(atRepoCommits.id, cursor) : undefined)
    .orderBy(asc(atRepoCommits.id))
    .limit(Math.min(Math.max(limit, 1), 1000));
  return rows.map((row) => ({
    id: row.id,
    createdAt: row.createdAt,
    did: row.did,
    rev: row.rev,
    commitCid: row.commitCid,
    prev: row.prev,
    car: row.car ? new Uint8Array(row.car) : new Uint8Array(0),
    ops: (row.snapshot as { ops?: LocalRepoCommit['ops'] } | null)?.ops ?? [],
  }));
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
  // One row per DID — its latest commit. Paging over commit rows would let a
  // busy DID fill the page and break the cursor contract.
  const rows = await db
    .selectDistinctOn([atRepoCommits.did], {
      did: atRepoCommits.did,
      rev: atRepoCommits.rev,
      commitCid: atRepoCommits.commitCid,
      createdAt: atRepoCommits.createdAt,
    })
    .from(atRepoCommits)
    .where(cursor ? sql`${atRepoCommits.did} > ${cursor}` : undefined)
    .orderBy(atRepoCommits.did, desc(atRepoCommits.createdAt))
    .limit(Math.min(limit, 100));
  const repos = rows.map((row) => ({
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

// Serve getRepo from the stored commit CAR without loading it whole: the
// response stream wraps the raw bytes, so nothing is buffered in memory.
export const getRepoCarStream = async (did: string, since?: string | null) => {
  const row = await getRepoSnapshot(did);
  if (!row?.car) return null;
  const bytes = new Uint8Array(row.car);
  const root = await readRepoRootCid(bytes);
  if (!root) return null;
  let cids: CID[] = [root];
  if (since) {
    cids = await collectCommitBlockCids(bytes);
    if (cids.length === 0) cids = [root];
  }
  return {
    rev: row.rev,
    commitCid: row.commitCid,
    car: await readRepoBlocks(bytes, cids),
  };
};

export const getRepoStatus = async (did: string) => {
  const identity = await loadLocalAtprotoIdentity(did);
  if (!identity) return null;
  const commit = await getLatestCommit(did);
  // `active: false` without a status means an unknown repo in the sync
  // spec; a never-committed DID is deactivated, not taken down.
  if (!commit) return { did, active: false, status: 'inactive' as const };
  return { did, active: true as const, rev: commit.rev };
};

export const listRecordsForDid = async (did: string) => {
  const db = pgDb();
  return db
    .select()
    .from(atRecords)
    .where(and(eq(atRecords.did, did), isNull(atRecords.deletedAt)));
};
