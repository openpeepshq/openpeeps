import { sql } from 'drizzle-orm';
import type {
  AuthorizationData,
  DbPost,
  PostWithMeta,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import {
  blockedPairIds,
  isOneToOneDm,
  isOneToOneWithBlocked,
  participantIds,
  toHiddenPost,
} from '@openpeepshq/common/lib';
import { allpeepDb } from '../db';
import type { PgDb } from '../db/pg/client';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { capabilitiesConfig } from '../config';
import { canReadPost, transformPost } from './helpers';
import { CONTEXT_NODE_CAP, collectReplyClosureIds } from './contextClosure';
import { postContextMappingForProfile } from './mapping';

type ExecuteResult = { rows: Record<string, unknown>[] };

type RootLeafPair = { rootId: string; leafId: string };

/** Root + newest leaf per DM thread the profile is in (ids only). */
export const listConversationRootLeafPairs = async (
  db: PgDb,
  profileId: string,
): Promise<RootLeafPair[]> => {
  const result = (await db.execute(sql`
    WITH RECURSIVE leaves AS (
      SELECT p.id::text AS leaf_id
      FROM audience a
      INNER JOIN posts p
        ON p.id::text = a.from_id
        AND p.deleted_at IS NULL
      WHERE a.to_id = ${profileId}
        AND p.visibility = 'direct'
        AND (
          SELECT count(*)::int
          FROM reply_to rt
          INNER JOIN posts rp
            ON rp.id::text = rt.from_id
            AND rp.deleted_at IS NULL
          WHERE rt.to_id = p.id::text
        ) = 0
    ),
    walk AS (
      SELECT l.leaf_id, l.leaf_id AS node_id, 0 AS depth
      FROM leaves l
      UNION ALL
      SELECT walk.leaf_id, rt.to_id, walk.depth + 1
      FROM reply_to rt
      INNER JOIN walk ON rt.from_id = walk.node_id
    ),
    roots AS (
      SELECT DISTINCT ON (leaf_id) leaf_id, node_id AS root_id
      FROM walk
      ORDER BY leaf_id, depth DESC
    ),
    best AS (
      SELECT DISTINCT ON (root_id) root_id, leaf_id
      FROM roots
      ORDER BY root_id, leaf_id DESC
    )
    SELECT root_id, leaf_id
    FROM best
    ORDER BY leaf_id DESC
  `)) as unknown as ExecuteResult;

  return result.rows.map((row) => ({
    rootId: row.root_id as string,
    leafId: row.leaf_id as string,
  }));
};

/** Newest post id in a reply thread (root included); uuidv7-ordered. */
export const findLatestThreadPostId = async (
  rootId: string,
): Promise<string> => {
  const { db } = await allpeepDb();
  const result = (await db.execute(sql`
    WITH RECURSIVE t AS (
      SELECT ${rootId}::text AS id
      UNION ALL
      SELECT rt.from_id
      FROM reply_to rt
      INNER JOIN t ON rt.to_id = t.id
      INNER JOIN posts p
        ON p.id::text = rt.from_id
        AND p.deleted_at IS NULL
    )
    SELECT id
    FROM t
    ORDER BY id DESC
    LIMIT 1
  `)) as unknown as ExecuteResult;

  return (result.rows[0]?.id as string | undefined) ?? rootId;
};

const hydrateLeanPostsByIds = async (
  authData: AuthorizationData,
  ids: string[],
): Promise<Map<string, PostWithMeta>> => {
  if (!ids.length) return new Map();
  const { db } = await allpeepDb();
  const mapData = postContextMappingForProfile(authData.profile).data();
  const rows = await fetchRowsByIds(
    db,
    mapData.collection,
    ids,
    mapData.softDelete,
  );
  const hydrated = (await hydrateMapData(
    db,
    mapData,
    rows,
  )) as unknown as DbPost[];
  const config = await capabilitiesConfig();
  const readable = canReadPost(config, authData);
  const pair = new Set(blockedPairIds(authData.profile));
  const byId = new Map<string, PostWithMeta>();
  for (const post of hydrated) {
    const transformed = await transformPost(post, authData.profile, {
      embedThreadPreview: false,
    });
    const creatorId = transformed.creatorId ?? transformed.profile?.id;
    if (creatorId && pair.has(creatorId)) {
      byId.set(transformed.id, toHiddenPost(transformed));
      continue;
    }
    if (readable(transformed)) byId.set(transformed.id, transformed);
  }
  return byId;
};

/**
 * Inbox list: one preview per conversation as [root, leaf] (or [root] when
 * they are the same). Avoids walking full ancestor chains.
 */
export const listConversationPreviews = async (
  authData: AuthorizationData,
): Promise<PostWithMeta[][]> => {
  const profile = authData.profile;
  if (!profile) {
    throw new Error('AuthorizationData.profile is required for this finder');
  }
  const { db } = await allpeepDb();
  const pairs = await listConversationRootLeafPairs(db, profile.id);
  const ids = [...new Set(pairs.flatMap((pair) => [pair.rootId, pair.leafId]))];
  const byId = await hydrateLeanPostsByIds(authData, ids);
  const blocked = new Set(blockedPairIds(profile));
  return mergeOneToOnePreviews(
    conversationPreviewsFromPairs(pairs, byId, profile, blocked),
  );
};

const conversationPreviewsFromPairs = (
  pairs: RootLeafPair[],
  byId: Map<string, PostWithMeta>,
  profile: ProfileWithMeta,
  blocked: Set<string>,
): PostWithMeta[][] =>
  pairs
    .map(({ rootId, leafId }) => {
      const root = byId.get(rootId);
      const leaf = byId.get(leafId);
      if (!root || !leaf) return null;
      if (isOneToOneWithBlocked(root, profile, blocked)) return null;
      return rootId === leafId ? [root] : [root, leaf];
    })
    .filter((conversation): conversation is PostWithMeta[] => !!conversation);

const oneToOnePairKey = (post: PostWithMeta) =>
  [...participantIds(post)].sort().join(',');

const byIdAsc = (a: PostWithMeta, b: PostWithMeta) =>
  a.id < b.id ? -1 : a.id > b.id ? 1 : 0;

/**
 * Collapse 1:1 previews sharing a participant pair into one entry
 * [oldest root, newest leaf] so a conversation with several roots lists
 * once. The oldest root (min uuidv7) is the pair's stable conversation id;
 * it must match the key the unseen counts are merged under. Other
 * conversations pass through. Result is ordered newest-leaf first.
 */
export const mergeOneToOnePreviews = (
  conversations: PostWithMeta[][],
): PostWithMeta[][] => {
  const merged: PostWithMeta[][] = [];
  const byPair = new Map<string, PostWithMeta[][]>();
  for (const conversation of conversations) {
    const root = conversation[0]!;
    if (!isOneToOneDm(root)) {
      merged.push(conversation);
      continue;
    }
    const pairKey = oneToOnePairKey(root);
    const entries = byPair.get(pairKey) ?? [];
    entries.push(conversation);
    byPair.set(pairKey, entries);
  }
  for (const entries of byPair.values()) {
    const root = entries
      .map((conversation) => conversation[0]!)
      .sort(byIdAsc)[0]!;
    const leaf = entries
      .map((conversation) => conversation[conversation.length - 1]!)
      .sort(byIdAsc)
      .at(-1)!;
    merged.push(root.id === leaf.id ? [root] : [root, leaf]);
  }
  return merged.sort((a, b) => byIdAsc(b[b.length - 1]!, a[a.length - 1]!));
};

/**
 * Archived conversations: threads the profile has left — detected by posts
 * they authored but are no longer in the audience of. Returns
 * [root, lastReadablePost] per conversation so the user can still find and
 * view the conversation history after leaving.
 */
export const listLeftConversations = async (
  authData: AuthorizationData,
): Promise<PostWithMeta[][]> => {
  const profile = authData.profile;
  if (!profile) {
    throw new Error('AuthorizationData.profile is required');
  }
  const { db } = await allpeepDb();
  type RootLeafPair = { rootId: string; leafId: string };
  const result = (await db.execute(sql`
    WITH left_posts AS (
      SELECT p.id AS left_id, rt.to_id AS parent_id
      FROM posts p
      INNER JOIN reply_to rt ON rt.from_id = p.id
      WHERE p.creator_id = ${profile.id}
        AND p.deleted_at IS NULL
        AND NOT EXISTS (
          SELECT 1 FROM audience a
          WHERE a.from_id = p.id AND a.to_id = p.creator_id
        )
    ),
    walk AS (
      SELECT lp.left_id AS conv_id, lp.parent_id AS leaf_id,
             lp.parent_id AS node_id, 0 AS depth
      FROM left_posts lp
      UNION ALL
      SELECT walk.conv_id, walk.leaf_id, rt.to_id, walk.depth + 1
      FROM reply_to rt
      INNER JOIN walk ON rt.from_id = walk.node_id
      WHERE walk.depth < 9999
    ),
    roots AS (
      SELECT DISTINCT ON (conv_id) conv_id, node_id AS root_id, leaf_id
      FROM walk
      ORDER BY conv_id, depth DESC
    )
    SELECT root_id, leaf_id FROM roots ORDER BY leaf_id DESC
  `)) as unknown as { rows: Record<string, unknown>[] };

  const pairs: RootLeafPair[] = result.rows.map((row) => ({
    rootId: row.root_id as string,
    leafId: row.leaf_id as string,
  }));

  if (pairs.length === 0) return [];

  const ids = [...new Set(pairs.flatMap((pair) => [pair.rootId, pair.leafId]))];
  const byId = await hydrateLeanPostsByIds(authData, ids);
  const blocked = new Set(blockedPairIds(profile));

  return mergeOneToOnePreviews(
    conversationPreviewsFromPairs(pairs, byId, profile, blocked),
  );
};

/**
 * Conversation detail: root plus newest capped descendants (lean mapping +
 * seenBatch). Prefer newest messages so long DMs stay usable.
 */
export const getConversationThread = async (
  root: PostWithMeta,
  authData: AuthorizationData,
  { limit = CONTEXT_NODE_CAP }: { limit?: number } = {},
): Promise<PostWithMeta[]> => {
  const { db } = await allpeepDb();
  const newestIds = await collectReplyClosureIds(db, root.id, 'descendents', {
    maxDepth: 9999,
    limit,
    newestFirst: true,
  });
  const byId = await hydrateLeanPostsByIds(authData, newestIds);
  const ordered = newestIds
    .map((id) => byId.get(id))
    .filter((post): post is PostWithMeta => !!post)
    .sort(byIdAsc);

  return [root, ...ordered.filter((post) => post.id !== root.id)];
};

/**
 * Non-deleted direct post whose participants (audience ∪ creator) are
 * exactly the pair — tolerates legacy rows where the creator is not in the
 * audience edge set.
 */
const oneToOnePairPost = (profileAId: string, profileBId: string) => sql`
  p.visibility = 'direct'
  AND p.deleted_at IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM audience a
    WHERE a.from_id = p.id::text
      AND a.to_id <> ${profileAId}
      AND a.to_id <> ${profileBId}
  )
  AND (p.creator_id = ${profileAId} OR EXISTS (
    SELECT 1 FROM audience a
    WHERE a.from_id = p.id::text AND a.to_id = ${profileAId}
  ))
  AND (p.creator_id = ${profileBId} OR EXISTS (
    SELECT 1 FROM audience a
    WHERE a.from_id = p.id::text AND a.to_id = ${profileBId}
  ))
`;

/**
 * All post ids in the 1:1 conversation between two profiles, oldest first:
 * every post of the pair, plus their reply descendants (e.g. system "left"
 * posts, whose participants are only the remaining participant and which
 * are reachable as descendants only). Ids are uuidv7, so ordering is
 * chronological.
 */
export const listOneToOneConversationPostIds = async (
  db: PgDb,
  profileAId: string,
  profileBId: string,
): Promise<string[]> => {
  const result = (await db.execute(sql`
    WITH RECURSIVE start AS (
      SELECT p.id::text AS id
      FROM posts p
      WHERE ${oneToOnePairPost(profileAId, profileBId)}
    ),
    walk AS (
      SELECT id FROM start
      UNION ALL
      SELECT rt.from_id::text
      FROM reply_to rt
      INNER JOIN walk ON rt.to_id = walk.id
    )
    SELECT DISTINCT id FROM walk
    ORDER BY id
  `)) as unknown as ExecuteResult;

  return result.rows.map((row) => row.id as string);
};

/**
 * Per root of a 1:1 conversation: the root id and that thread's newest post
 * (leaf). Used to terminate every root's thread on leave.
 */
export const listOneToOneConversationRootLeaves = async (
  db: PgDb,
  profileAId: string,
  profileBId: string,
): Promise<Array<{ rootId: string; leafId: string }>> => {
  const result = (await db.execute(sql`
    WITH RECURSIVE start AS (
      SELECT p.id::text AS root_id, p.id::text AS node_id
      FROM posts p
      WHERE ${oneToOnePairPost(profileAId, profileBId)}
        AND NOT EXISTS (
          SELECT 1 FROM reply_to rt
          WHERE rt.from_id = p.id::text
        )
    ),
    walk AS (
      SELECT root_id, node_id FROM start
      UNION ALL
      SELECT walk.root_id, rt.from_id::text
      FROM reply_to rt
      INNER JOIN walk ON rt.to_id = walk.node_id
    )
    SELECT DISTINCT ON (root_id) root_id, node_id AS leaf_id
    FROM walk
    ORDER BY root_id, node_id DESC
  `)) as unknown as ExecuteResult;

  return result.rows.map((row) => ({
    rootId: row.root_id as string,
    leafId: row.leaf_id as string,
  }));
};

/**
 * Merged 1:1 conversation: every message for the pair across all roots,
 * oldest first. Any post of the conversation (typically the root in the URL)
 * resolves to the same list. Capped like {@link getConversationThread}:
 * the oldest message plus the newest CONTEXT_NODE_CAP others.
 */
export const getOneToOneConversation = async (
  post: PostWithMeta,
  authData: AuthorizationData,
): Promise<PostWithMeta[]> => {
  const { db } = await allpeepDb();
  const [profileAId, profileBId] = [...participantIds(post)];
  const ids = await listOneToOneConversationPostIds(
    db,
    profileAId!,
    profileBId!,
  );
  if (ids.length === 0) return [];
  const capped =
    ids.length > CONTEXT_NODE_CAP + 1
      ? [ids[0]!, ...ids.slice(-CONTEXT_NODE_CAP)]
      : ids;
  const byId = await hydrateLeanPostsByIds(authData, [...new Set(capped)]);
  return capped
    .map((id) => byId.get(id))
    .filter((message): message is PostWithMeta => !!message);
};
