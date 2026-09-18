import type { DbPost } from '@openpeepshq/common/types';
import { allpeepDb } from '../db';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { collectReplyClosureIds } from './replyClosure';
import {
  EMBEDDED_LATEST_REPLIES_LIMIT,
  threadPreviewMappingForProfile,
} from './mapping';

export const THREAD_PREVIEW_LIMIT = EMBEDDED_LATEST_REPLIES_LIMIT;

export const loadThreadPreviewReplies = async (
  rootId: string,
  currentProfile?: { id: string },
): Promise<{ replies: DbPost[]; hasMore: boolean }> => {
  if (!rootId) return { replies: [], hasMore: false };

  const { db } = await allpeepDb();
  const ids = await collectReplyClosureIds(db, rootId, 'descendents', {
    newestFirst: true,
    limit: THREAD_PREVIEW_LIMIT + 1,
  });
  const hasMore = ids.length > THREAD_PREVIEW_LIMIT;
  const previewIds = ids.slice(0, THREAD_PREVIEW_LIMIT);
  if (!previewIds.length) return { replies: [], hasMore: false };

  const mapData = threadPreviewMappingForProfile(currentProfile).data();
  const rows = await fetchRowsByIds(
    db,
    mapData.collection,
    previewIds,
    mapData.softDelete,
  );
  const hydrated = (await hydrateMapData(
    db,
    mapData,
    rows,
  )) as unknown as DbPost[];
  const byPreviewId = new Map(hydrated.map((post) => [post.id, post]));

  const parentIds = [
    ...new Set(
      hydrated
        .map((post) => post.inReplyToId)
        .filter(
          (id): id is string => !!id && id !== rootId && !byPreviewId.has(id),
        ),
    ),
  ];
  let parents: DbPost[] = [];
  if (parentIds.length) {
    const parentRows = await fetchRowsByIds(
      db,
      mapData.collection,
      parentIds,
      mapData.softDelete,
    );
    parents = (await hydrateMapData(
      db,
      mapData,
      parentRows,
    )) as unknown as DbPost[];
  }
  const byId = new Map(
    [...hydrated, ...parents].map((post) => [post.id, post]),
  );

  const replies = previewIds
    .map((id) => byPreviewId.get(id))
    .filter((post): post is DbPost => !!post)
    .map((post) => {
      const parentId = post.inReplyToId;
      if (!parentId || parentId === rootId) return post;
      const parent = byId.get(parentId);
      return parent ? { ...post, replyTo: parent } : post;
    });

  return { replies, hasMore };
};
