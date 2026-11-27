import { sql, type SQL } from 'drizzle-orm';
import { posts } from '../db/pg/schema/documents';
import { blocks, postGroups, userGroups } from '../db/pg/schema/edges';

export type SearchRequester = {
  profileId?: string;
  groupIds: string[];
  /** Creators excluded by the block edge (both directions). */
  blockedIds?: string[];
};

export type VisibilityPost = {
  visibility: string;
  creatorId: string;
  groupIds: string[];
};

/**
 * Direct posts are never searchable. Private posts are visible only to their
 * author. Group posts are visible to the author and to members of a linked
 * group. Public, unlisted, and local posts are visible. Posts from a
 * blocked/blocking profile are never returned, mirroring the feed.
 */
export const postVisibleTo = (
  post: VisibilityPost,
  requester: SearchRequester,
): boolean => {
  if (post.visibility === 'direct') return false;
  if (requester.blockedIds?.includes(post.creatorId)) return false;
  if (
    post.visibility === 'public' ||
    post.visibility === 'unlisted' ||
    post.visibility === 'local'
  ) {
    return true;
  }
  const isAuthor =
    !!requester.profileId && requester.profileId === post.creatorId;
  if (post.visibility === 'private') return isAuthor;
  if (post.visibility === 'group') {
    if (isAuthor) return true;
    return post.groupIds.some((groupId) =>
      requester.groupIds.includes(groupId),
    );
  }
  return false;
};

export type VisibleHit = {
  id: string;
  collection: string;
  visibility?: string;
  creatorId?: string;
  groupIds?: string[];
};

/**
 * Missing post metadata fails closed (treated as direct). Profile and
 * community-knowledge hits have no post visibility of their own, but a
 * profile hit is still hidden when the pair is blocked — the same two-directional
 * block edge every other people surface applies.
 */
export const hitVisibleTo = (
  hit: VisibleHit,
  requester: SearchRequester,
): boolean => {
  if (hit.collection === 'community_knowledge') return true;
  if (hit.collection === 'profiles') {
    return !requester.blockedIds?.includes(hit.id);
  }
  return postVisibleTo(
    {
      visibility: hit.visibility ?? 'direct',
      creatorId: hit.creatorId ?? '',
      groupIds: hit.groupIds ?? [],
    },
    requester,
  );
};

/**
 * SQL twin of `postVisibleTo`. Membership comes from `user_groups` for the
 * server-resolved profile id, not from caller-supplied group ids. The block
 * edge (both directions) mirrors the feed's `notCreatorIn(blockedPairIds)`.
 */
export const postVisibilitySql = (profileId?: string): SQL => {
  const owner = profileId ? sql`${posts.creatorId} = ${profileId}` : sql`false`;
  const groupMember = profileId
    ? sql`EXISTS (
        SELECT 1 FROM ${userGroups} ug
        JOIN ${postGroups} pgroups ON pgroups.to_id = ug.to_id
        WHERE pgroups.from_id = ${posts.id}::text
          AND ug.from_id = ${profileId}
      )`
    : sql`false`;
  const blockedPair = profileId
    ? sql`EXISTS (
        SELECT 1 FROM ${blocks} b
        WHERE (b."from_id" = ${profileId} AND b."to_id" = ${posts.creatorId})
           OR (b."from_id" = ${posts.creatorId} AND b."to_id" = ${profileId})
      )`
    : sql`false`;
  return sql`(
    ${posts.deletedAt} IS NULL
    AND ${posts.visibility} <> 'direct'
    AND NOT ${blockedPair}
    AND (
      ${posts.visibility} IN ('public', 'unlisted', 'local')
      OR (${posts.visibility} = 'private' AND ${owner})
      OR (${posts.visibility} = 'group' AND (${owner} OR ${groupMember}))
    )
  )`;
};
