import { sql } from 'drizzle-orm';
import type {
  AuthorizationData,
  DbPost,
  PostWithMeta,
} from '@openpeepshq/common/types';
import { getUniqueBy } from '@openpeepshq/common/lib';
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
  const byId = new Map<string, PostWithMeta>();
  for (const post of hydrated) {
    const transformed = await transformPost(post, authData.profile);
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
  return getUniqueBy(
    pairs
      .map(({ rootId, leafId }) => {
        const root = byId.get(rootId);
        const leaf = byId.get(leafId);
        if (!root || !leaf) return null;
        return rootId === leafId ? [root] : [root, leaf];
      })
      .filter((conversation): conversation is PostWithMeta[] => !!conversation),
    (conversation) => conversation[0]!.id,
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
    .sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));

  return [root, ...ordered.filter((post) => post.id !== root.id)];
};
