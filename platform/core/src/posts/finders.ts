import {
  AuthorizationData,
  PostWithMeta,
  Post,
  PostType,
  Profile,
  DbPost,
  DbBasePost,
  UnseenPostCounts,
} from '@openpeepshq/common/types';
import { ProfileWithMeta } from '@openpeepshq/common/types';
import { allpeepDb, collectionInfos } from '../db';
import { edgeFilters, postFilters } from '../db/pg/filters';
import {
  contextRelation,
  conversationLeavesMappingForProfile,
  postContextMappingForProfile,
  postsAuthMapping,
  postsMappingForProfile,
  repostsOfPostRelationForProfile,
  postIdsMapping,
} from './mapping';
import {
  audienceConnectionFinder,
  localFeedFilter,
  mentionsConnectionFinder,
  myFeedFilter,
  myFeedGroupMembershipFilter,
  pastEventsFilter,
  toFilteredPostsList,
  transformPost,
} from './helpers';
import type { Mapping, ObjectSort, PgFilter } from '../db/pg/map';
import { addQuerySort, addStart, sortOldestFirst } from '../db/helpers';
import { sorts } from '../db/pg/queries';
import { findHashtagByTag, hashtagsMapping } from '../hashtags';
import { findGroup } from '../groups/finders';
import { groupsMapping } from '../groups/mapping';
import { profilesMapping } from '../profiles/mapping';
import { CONTEXT_NODE_CAP, loadReplyContextPosts } from './contextClosure';
import { withSpan } from '../performance';
import { queryUnseenPostCounts } from './unseenCounts';
import { getConversationThread } from './conversationQueries';
import { fetchRowsByIds, hydrateMapData } from '../db/pg/map/relations';
import { listEventAgenda } from './eventAgenda';

/**
 * Throws if the given `authData` does not include a profile.
 *
 * Used by `*My*` finders that need a logged-in profile to build the query
 * filter. Endpoints that call these finders should already gate on
 * `ensureLocalProfile` so this is purely a defensive check.
 */
const requireProfile = (authData: AuthorizationData): ProfileWithMeta => {
  if (!authData.profile) {
    throw new Error('AuthorizationData.profile is required for this finder');
  }
  return authData.profile;
};

export const findPost = async (
  id: string,
  authData?: AuthorizationData,
): Promise<PostWithMeta | undefined> => {
  const profile = authData?.profile;
  return allpeepDb()
    .then(({ db }) => postsMappingForProfile(profile).find(db, id))
    .then((post) => (post ? transformPost(post, profile) : undefined));
};

/** Lean post load for capability checks (no nested reply/repost). */
export const findPostsForAuth = async (
  ids: string[],
  authData?: AuthorizationData,
): Promise<PostWithMeta[]> => {
  if (ids.length === 0) return [];
  const profile = authData?.profile;
  const { db } = await allpeepDb();
  const mapData = postsAuthMapping.data();
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
  const byId = new Map(
    await Promise.all(
      hydrated.map(async (post) => {
        const transformed = await transformPost(post, profile);
        return [transformed.id, transformed] as const;
      }),
    ),
  );
  return ids
    .map((id) => byId.get(id))
    .filter((post): post is PostWithMeta => !!post);
};

export const postContext = async (
  authData: AuthorizationData,
  id: string,
  depth: number,
  direction: 'ancestors' | 'descendents',
  contextMapping?: Mapping<DbPost>,
) => {
  const profile = authData.profile;
  const mapping = postsMappingForProfile(profile);
  return toFilteredPostsList(
    mapping.relationsFrom(
      { id },
      contextRelation(depth, direction, contextMapping ?? mapping),
    ),
    { authData },
  );
};

export const descendents = async (
  authData: AuthorizationData,
  post: PostWithMeta,
  depth: number,
  contextMapping?: Mapping<DbPost>,
) => postContext(authData, post.id, depth, 'descendents', contextMapping);

export const ancestors = async (
  authData: AuthorizationData,
  post: PostWithMeta,
  depth: number,
  contextMapping?: Mapping<DbPost>,
) => postContext(authData, post.id, depth, 'ancestors', contextMapping);

export const replies = async (
  authData: AuthorizationData,
  post: PostWithMeta,
) => descendents(authData, post, 1);

export const baseListPosts = ({
  start,
  profile,
}: {
  start?: string;
  profile?: ProfileWithMeta;
}) => addStart<DbPost>(postsMappingForProfile(profile), start);

export const baseFeed = ({
  start,
  sort,
  profile,
}: {
  start?: string;
  sort?: ObjectSort;
  profile?: ProfileWithMeta;
}) =>
  addQuerySort(
    baseListPosts({ start, profile }).filter(postFilters.notDirect()),
    sort,
  );

/**
 * Community / my / group timelines: original posts (and reposts) only.
 * Replies stay nested on the post detail thread so the same conversation is
 * not repeated as standalone feed items.
 */
const timelineFeed = ({
  start,
  sort,
  profile,
}: {
  start?: string;
  sort?: ObjectSort;
  profile?: ProfileWithMeta;
}) => baseFeed({ start, sort, profile }).filter(postFilters.notReply());

export const baseEventsFeed = (profile?: ProfileWithMeta) => {
  const mapping = postsMappingForProfile(profile)
    .sort(sorts.eventStartAsc)
    .filter({ matches: { type: 'event' } });
  return mapping;
};

export const listPosts = async (
  authData: AuthorizationData,
  {
    start,
    limit = 100,
    filter,
  }: { start?: string; limit?: number; filter?: PgFilter<DbBasePost> } = {
    limit: 100,
  },
) =>
  toFilteredPostsList(
    baseListPosts({ start, profile: authData.profile }).filter(filter),
    { authData, limit },
  );

export const listConversationLeaves = async (authData: AuthorizationData) =>
  withSpan('conversations.list', () =>
    toFilteredPostsList(
      profilesMapping.relationsFrom(requireProfile(authData), {
        alias: 'posts',
        edgeCollection: collectionInfos.audienceCollection.name,
        direction: 'INBOUND',
        skipEdge: true,
        cardinality: 'many',
        mapping: conversationLeavesMappingForProfile(requireProfile(authData))
          .sort(sorts.createdAtDesc)
          .data(),
      }),
      { authData, limit: 9999 },
    ),
  );

export const listPostsByProfile = async (
  authData: AuthorizationData,
  requestedProfile: ProfileWithMeta,
  {
    start,
    limit = 100,
    filter,
  }: { start?: string; limit?: number; filter?: PgFilter<DbBasePost> } = {
    limit: 100,
  },
) =>
  toFilteredPostsList(
    profilesMapping.relationsFrom(requestedProfile, {
      alias: 'posts',
      edgeCollection: collectionInfos.entriesCollection.name,
      direction: 'OUTBOUND',
      edgeFilter: edgeFilters.entryType('create'),
      skipEdge: true,
      cardinality: 'many',
      mapping: baseFeed({ start, profile: authData.profile })
        .filter(filter)
        .data(),
    }),
    { authData, limit },
  );

export const listBookmarkedPosts = async (
  authData: AuthorizationData,
  requestedProfile: ProfileWithMeta,
  {
    start,
    limit = 100,
    filter,
  }: { start?: string; limit?: number; filter?: PgFilter<DbBasePost> } = {
    limit: 100,
  },
) =>
  toFilteredPostsList(
    profilesMapping.relationsFrom(requestedProfile, {
      alias: 'posts',
      edgeCollection: collectionInfos.bookmarksCollection.name,
      direction: 'OUTBOUND',
      skipEdge: true,
      cardinality: 'many',
      mapping: baseFeed({ start, profile: authData.profile })
        .filter(filter)
        .data(),
    }),
    { authData, limit },
  );

export const listBookmarkedPostIds = async (
  requestedProfile: ProfileWithMeta,
): Promise<string[]> => {
  const { db } = await allpeepDb();
  return profilesMapping
    .relationsFrom(requestedProfile, {
      alias: 'posts',
      edgeCollection: collectionInfos.bookmarksCollection.name,
      direction: 'OUTBOUND',
      skipEdge: true,
      cardinality: 'many',
      mapping: postIdsMapping.data(),
    })
    .all(db)
    .then((posts: { id: string }[]) => posts.map((p) => p.id));
};

export const getUnseenPostCounts = async (
  authData: AuthorizationData,
): Promise<UnseenPostCounts> =>
  withSpan('unseen.counts', async () => {
    const profile = requireProfile(authData);
    const groupIds = profile.memberships
      .map((membership) => membership.group.id)
      .filter((groupId): groupId is string => typeof groupId === 'string');
    const { db } = await allpeepDb();
    return queryUnseenPostCounts(db, profile.id, groupIds);
  });

export const listPostsByType = async (
  authData: AuthorizationData,
  type: PostType,
  {
    start,
    limit = 100,
    filter,
  }: { start?: string; limit?: number; filter?: PgFilter<DbBasePost> } = {
    limit: 100,
  },
) =>
  toFilteredPostsList(
    baseFeed({ start, profile: authData.profile })
      .filter(filter)
      .filter({ matches: { type } }),
    { authData, limit },
  );

export const listPostsByTag = async (
  authData: AuthorizationData,
  tag: string,
  {
    start,
    limit = 100,
    filter,
  }: { start?: string; limit?: number; filter?: PgFilter<DbBasePost> } = {
    limit: 100,
  },
) => {
  const hashtag = await findHashtagByTag(tag);
  if (!hashtag) {
    return [];
  }
  return toFilteredPostsList(
    hashtagsMapping.relationsFrom(hashtag, {
      alias: 'posts',
      edgeCollection: collectionInfos.postHashtagsCollection.name,
      direction: 'INBOUND',
      cardinality: 'many',
      skipEdge: true,
      mapping: baseFeed({ start, profile: authData.profile })
        .filter(filter)
        .data(),
    }),
    { authData, limit },
  );
};

export const listPostsByGroup = async (
  authData: AuthorizationData,
  groupId: string,
  {
    start,
    limit = 100,
    filter,
    sort: _sort,
  }: {
    start?: string;
    limit?: number;
    filter?: PgFilter<DbBasePost>;
    sort?: ObjectSort;
  } = { limit: 100 },
) =>
  withSpan('feed.group', async () => {
    const group = await findGroup(groupId);
    if (!group) {
      return [];
    }
    return toFilteredPostsList(
      groupsMapping.relationsFrom(group, {
        alias: 'posts',
        edgeCollection: collectionInfos.postGroupsCollection.name,
        direction: 'INBOUND',
        skipEdge: true,
        cardinality: 'many',
        mapping: timelineFeed({ start, profile: authData.profile })
          .filter(filter)
          .data(),
      }),
      { authData, limit },
    );
  });

export const listLocalFeed = async (
  authData: AuthorizationData,
  { start, limit = 100 }: { start?: string; limit?: number } = { limit: 100 },
) =>
  withSpan('feed.local', () =>
    toFilteredPostsList(
      timelineFeed({ start, profile: authData.profile }).filter(
        localFeedFilter(),
      ),
      { authData, limit },
    ),
  );

export const listMyFeed = async (
  authData: AuthorizationData,
  { start, limit = 100 }: { start?: string; limit?: number } = { limit: 100 },
) => {
  const profile = requireProfile(authData);
  return withSpan('feed.my', () =>
    toFilteredPostsList(
      timelineFeed({ start, profile }).filter(myFeedFilter(profile)),
      { authData, limit, filters: [myFeedGroupMembershipFilter(profile)] },
    ),
  );
};

export const listUpcomingEventsFeed = async (
  authData: AuthorizationData,
  {
    offset,
    limit = 100,
    jamOnly,
    mine,
  }: { offset?: number; limit?: number; jamOnly?: boolean; mine?: boolean } = {
    limit: 100,
  },
) => listEventAgenda(authData, 'upcoming', { offset, limit, jamOnly, mine });

export const listCurrentEventsFeed = async (
  authData: AuthorizationData,
  {
    offset,
    limit = 100,
    jamOnly,
    mine,
  }: { offset?: number; limit?: number; jamOnly?: boolean; mine?: boolean } = {
    limit: 100,
  },
) => listEventAgenda(authData, 'current', { offset, limit, jamOnly, mine });

export const listPastEventsFeed = async (
  authData: AuthorizationData,
  {
    offset,
    limit = 100,
    jamOnly,
    mine,
  }: { offset?: number; limit?: number; jamOnly?: boolean; mine?: boolean } = {
    limit: 100,
  },
) => listEventAgenda(authData, 'past', { offset, limit, jamOnly, mine });

export const listMyUpcomingEventsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listUpcomingEventsFeed(authData, {
    offset,
    mine: true,
    limit,
  });

export const listMyCurrentEventsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listCurrentEventsFeed(authData, {
    offset,
    mine: true,
    limit,
  });

export const listMyPastEventsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listPastEventsFeed(authData, {
    offset,
    mine: true,
    limit,
  });

export const listUpcomingJamsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) => listUpcomingEventsFeed(authData, { offset, jamOnly: true, limit });

export const listPastJamsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) => listPastEventsFeed(authData, { offset, jamOnly: true, limit });

export const listMyPastJamsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listPastEventsFeed(authData, {
    offset,
    jamOnly: true,
    mine: true,
    limit,
  });

export const listMyUpcomingJamsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listUpcomingEventsFeed(authData, {
    offset,
    jamOnly: true,
    mine: true,
    limit,
  });

export const listUpcomingGroupEventsFeed = async (
  authData: AuthorizationData,
  groupId: string,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) => {
  const group = await findGroup(groupId);
  if (!group) {
    throw new Error(`Group ${groupId} not found`);
  }
  return listEventAgenda(authData, 'upcoming', { offset, limit, groupId });
};

export const listPastGroupEventsFeed = async (
  authData: AuthorizationData,
  groupId: string,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) => {
  const group = await findGroup(groupId);
  if (!group) {
    throw new Error(`Group ${groupId} not found`);
  }
  return listEventAgenda(authData, 'past', { offset, limit, groupId });
};

export const reposts = async (
  post: PostWithMeta,
  authData: AuthorizationData,
) =>
  toFilteredPostsList(
    postsMappingForProfile(authData.profile).relationsFrom(
      post,
      repostsOfPostRelationForProfile(authData.profile),
    ),
    { authData },
  );

export const getConversationByEnd = async (
  post: PostWithMeta,
  authData: AuthorizationData,
) =>
  ancestors(
    authData,
    post,
    9999,
    sortOldestFirst<DbPost>(postsMappingForProfile(authData.profile)),
  ).then((conversation) => [...conversation, post]);

export const getConversationByStart = async (
  post: PostWithMeta,
  authData: AuthorizationData,
) => getConversationThread(post, authData);

/** Full ancestor/descendant trees for post detail (CTE + lean mapping). */
export const getPostContext = async (
  post: PostWithMeta,
  authData: AuthorizationData,
) => {
  const mapping = sortOldestFirst<DbPost>(
    postContextMappingForProfile(authData.profile),
  );
  const [ancestorPosts, descendantPosts] = await Promise.all([
    loadReplyContextPosts(authData, post.id, 'ancestors', mapping, {
      maxDepth: 9999,
      limit: CONTEXT_NODE_CAP,
    }),
    loadReplyContextPosts(authData, post.id, 'descendents', mapping, {
      maxDepth: 9999,
      limit: CONTEXT_NODE_CAP,
    }),
  ]);
  return { ancestors: ancestorPosts, descendants: descendantPosts };
};

export const mentions = async (post: Post, profile: Profile) =>
  allpeepDb().then(({ db }) => mentionsConnectionFinder(db, post, profile));

export const audience = async (post: Post, profile: Profile) =>
  allpeepDb().then(({ db }) => audienceConnectionFinder(db, post, profile));
