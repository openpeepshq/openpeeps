import {
  AuthorizationData,
  PostWithMeta,
  Post,
  PostType,
  Profile,
  DbPost,
  DbBasePost,
  UnseenPostCounts,
} from '@openpeeps/common/types';
import { ProfileWithMeta } from '@openpeeps/common/types';
import { allpeepDb, collectionInfos } from '../db';
import { edgeFilters, postFilters } from '../db/pg/filters';
import {
  contextRelation,
  conversationLeavesMappingForProfile,
  postsMappingForProfile,
  repostsOfPostRelationForProfile,
  postIdsMapping,
} from './mapping';
import {
  audienceConnectionFinder,
  currentEventsFilter,
  jamFilter,
  localFeedFilter,
  mentionsConnectionFinder,
  myEventsFilter,
  myFeedFilter,
  myFeedGroupMembershipFilter,
  pastEventsFilter,
  toFilteredPostsList,
  transformPost,
  upcomingEventsFilter,
} from './helpers';
import type { Mapping, ObjectSort, PgFilter } from '../db/pg/map';
import { addQuerySort, addStart, sortOldestFirst } from '../db/helpers';
import { sorts } from '../db/pg/queries';
import { findHashtagByTag, hashtagsMapping } from '../hashtags';
import { findGroup } from '../groups/finders';
import { groupsMapping } from '../groups/mapping';
import { profilesMapping } from '../profiles/mapping';

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
): Promise<UnseenPostCounts> => {
  const profile = requireProfile(authData);
  const groupIds = profile.memberships
    .map((membership) => membership.group.id)
    .filter((groupId): groupId is string => typeof groupId === 'string');
  const groupCounts: Record<string, number> = Object.fromEntries(
    groupIds.map((groupId) => [groupId, 0]),
  );

  await Promise.all(
    groupIds.map(async (groupId) => {
      const posts = await listPostsByGroup(authData, groupId, { limit: 9999 });
      groupCounts[groupId] = posts.filter(
        (post) => post.seen === false && post.profile.id !== profile.id,
      ).length;
    }),
  );

  const conversations = await Promise.all(
    (await listConversationLeaves(authData)).map((post) =>
      getConversationByEnd(post, authData),
    ),
  );
  const uniqueConversations = Array.from(
    new Map(
      conversations
        .filter((conversation) => conversation[0])
        .map((conversation) => [conversation[0].id, conversation]),
    ).values(),
  );
  const direct = Object.fromEntries(
    uniqueConversations
      .map((conversation) => {
        const conversationId = conversation[0].id;
        const unread = conversation.filter(
          (post) => post.seen === false && post.profile.id !== profile.id,
        ).length;
        return [conversationId, unread] as const;
      })
      .filter(([, unread]) => unread > 0),
  );

  return { groups: groupCounts, direct };
};

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
) => {
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
      mapping: baseFeed({ start, profile: authData.profile })
        .filter(filter)
        .data(),
    }),
    { authData, limit },
  );
};

export const listUpcomingEventsFeed = async (
  authData: AuthorizationData,
  {
    offset,
    limit = 100,
    filter,
  }: { offset?: number; limit?: number; filter?: PgFilter<DbBasePost> } = {
    limit: 100,
  },
) =>
  toFilteredPostsList(
    baseEventsFeed(authData.profile)
      .filter(upcomingEventsFilter())
      .filter(filter),
    { authData, limit, offset },
  );

export const listCurrentEventsFeed = async (
  authData: AuthorizationData,
  {
    offset,
    limit = 100,
    filter,
  }: { offset?: number; limit?: number; filter?: PgFilter<DbBasePost> } = {
    limit: 100,
  },
) =>
  toFilteredPostsList(
    baseEventsFeed(authData.profile)
      .filter(currentEventsFilter())
      .filter(filter),
    { authData, limit, offset },
  );

export const listPastEventsFeed = async (
  authData: AuthorizationData,
  {
    offset,
    limit = 100,
    filter,
  }: { offset?: number; limit?: number; filter?: PgFilter<DbBasePost> } = {
    limit: 100,
  },
) =>
  toFilteredPostsList(
    baseEventsFeed(authData.profile)
      .sort(sorts.eventStartDesc)
      .filter(pastEventsFilter())
      .filter(filter),
    { authData, limit, offset },
  );

export const listMyUpcomingEventsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listUpcomingEventsFeed(authData, {
    offset,
    filter: myEventsFilter(requireProfile(authData)),
    limit,
  });

export const listMyCurrentEventsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listCurrentEventsFeed(authData, {
    offset,
    filter: myEventsFilter(requireProfile(authData)),
    limit,
  });

export const listMyPastEventsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listPastEventsFeed(authData, {
    offset,
    filter: myEventsFilter(requireProfile(authData)),
    limit,
  });

export const listUpcomingJamsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) => listUpcomingEventsFeed(authData, { offset, filter: jamFilter, limit });

export const listPastJamsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) => listPastEventsFeed(authData, { offset, filter: jamFilter, limit });

export const listMyPastJamsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listPastEventsFeed(authData, {
    offset,
    filter: {
      operator: '&&',
      predicates: [myEventsFilter(requireProfile(authData)), jamFilter],
    },
    limit,
  });

export const listMyUpcomingJamsFeed = async (
  authData: AuthorizationData,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  listUpcomingEventsFeed(authData, {
    offset,
    filter: {
      operator: '&&',
      predicates: [myEventsFilter(requireProfile(authData)), jamFilter],
    },
    limit,
  });

const baseGroupEventsFeed = async (
  authData: AuthorizationData,
  groupId: string,
  { filter, sort }: { filter?: PgFilter<DbBasePost>; sort?: ObjectSort } = {},
) => {
  const group = await findGroup(groupId);
  if (!group) {
    throw new Error(`Group ${groupId} not found`);
  }
  const profile = authData.profile;
  return groupsMapping.relationsFrom(group, {
    alias: 'posts',
    edgeCollection: collectionInfos.postGroupsCollection.name,
    direction: 'INBOUND',
    skipEdge: true,
    cardinality: 'many',
    mapping: baseEventsFeed(profile).filter(filter).sort(sort).data(),
  });
};

export const listUpcomingGroupEventsFeed = async (
  authData: AuthorizationData,
  groupId: string,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  toFilteredPostsList(
    await baseGroupEventsFeed(authData, groupId, {
      filter: upcomingEventsFilter(),
    }),
    { authData, limit, offset },
  );

export const listPastGroupEventsFeed = async (
  authData: AuthorizationData,
  groupId: string,
  { offset, limit = 100 }: { offset?: number; limit?: number } = { limit: 100 },
) =>
  toFilteredPostsList(
    await baseGroupEventsFeed(authData, groupId, {
      filter: pastEventsFilter(),
      sort: sorts.eventStartDesc,
    }),
    { authData, limit, offset },
  );

export const listLocalFeed = async (
  authData: AuthorizationData,
  { start, limit = 100 }: { start?: string; limit?: number } = { limit: 100 },
) =>
  toFilteredPostsList(
    baseFeed({ start, profile: authData.profile }).filter(
      localFeedFilter(authData.profile),
    ),
    { authData, limit },
  );

export const listMyFeed = async (
  authData: AuthorizationData,
  { start, limit = 100 }: { start?: string; limit?: number } = { limit: 100 },
) => {
  const profile = requireProfile(authData);
  return toFilteredPostsList(
    baseFeed({ start, profile }).filter(myFeedFilter(profile)),
    { authData, limit, filters: [myFeedGroupMembershipFilter(profile)] },
  );
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
) =>
  descendents(
    authData,
    post,
    9999,
    sortOldestFirst<DbPost>(postsMappingForProfile(authData.profile)),
  ).then((conversation) => [post, ...conversation]);

export const mentions = async (post: Post, profile: Profile) =>
  allpeepDb().then(({ db }) => mentionsConnectionFinder(db, post, profile));

export const audience = async (post: Post, profile: Profile) =>
  allpeepDb().then(({ db }) => audienceConnectionFinder(db, post, profile));
