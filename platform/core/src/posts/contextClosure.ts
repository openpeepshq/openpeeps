import type {
  AuthorizationData,
  DbPost,
  PostWithMeta,
} from '@openpeepshq/common/types';
import { blockedPairIds, toHiddenPost } from '@openpeepshq/common/lib';
import { allpeepDb } from '../db';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { applySort } from '../db/pg/map/filters';
import type { Mapping } from '../db/pg/map';
import { capabilitiesConfig } from '../config';
import { canReadPost, transformPost } from './helpers';
import { CONTEXT_NODE_CAP, collectReplyClosureIds } from './replyClosure';

type ClosureDirection = 'ancestors' | 'descendents';

export { CONTEXT_NODE_CAP, collectReplyClosureIds } from './replyClosure';

/** Load and hydrate posts in a reply closure, then ACL-filter + transform. */
export const loadReplyContextPosts = async (
  authData: AuthorizationData,
  startId: string,
  direction: ClosureDirection,
  mapping: Mapping<DbPost>,
  {
    maxDepth = 9999,
    limit = CONTEXT_NODE_CAP,
  }: { maxDepth?: number; limit?: number } = {},
): Promise<PostWithMeta[]> => {
  const { db } = await allpeepDb();
  const mapData = mapping.data();
  const ids = await collectReplyClosureIds(db, startId, direction, {
    maxDepth,
    limit,
  });
  if (!ids.length) return [];

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
  const sorted = applySort(hydrated, mapData.sort) as DbPost[];

  const config = await capabilitiesConfig();
  const readable = canReadPost(config, authData);
  const pair = new Set(blockedPairIds(authData.profile));
  const posts: PostWithMeta[] = [];
  for (const post of sorted) {
    const transformed = await transformPost(post, authData.profile, {
      embedThreadPreview: false,
    });
    const creatorId = transformed.creatorId ?? transformed.profile?.id;
    if (creatorId && pair.has(creatorId)) {
      if (direction === 'descendents') {
        posts.push(toHiddenPost(transformed));
      }
      continue;
    }
    if (readable(transformed)) posts.push(transformed);
  }
  return posts;
};
