import {
  AuthorizationData,
  PostWithMeta,
  PostDataUnion,
  Profile,
  EntryData,
  Post,
  GroupWithMeta,
  Hashtag,
  MentionData,
  ReactionData,
  ProfileWithMeta,
  hashtagRegex,
  normalizeHashtagTag,
  EntryWithProfile,
  ReactionProfile,
  MentionWithProfile,
  MentionWithPublicProfile,
  DbPost,
  DbEntry,
  DbMention,
  DbReaction,
  handleRegex,
} from '@openpeeps/common/types';
import { findProfileByHandle } from '../../profiles/finders';
import {
  composeFilters,
  connectionFinder,
  connector,
  disconnector,
  filterAndTransform,
} from '../../db/helpers';
import { allpeepDb, collectionInfos } from '../../db';
import type { PgQueryResult } from '../../db/pg/map/types';
import { capabilitiesConfig } from '../../config';
import { canReadPost } from './filters';
import { normalizePostDataFromDb } from '@openpeeps/common/lib';
import { ObjectFilter } from '../../db/types';
import { getProfile } from '../../profiles/cache';

export const isDirect = (post: PostWithMeta) => post.visibility === 'direct';
export const isPrivate = (post: PostWithMeta) => post.visibility === 'private';
export const isUnlisted = (post: PostWithMeta) =>
  post.visibility === 'unlisted';
export const isPublic = (post: PostWithMeta) => post.visibility === 'public';
export const isGroup = (post: PostWithMeta) => post.visibility === 'group';
export const isLocal = (post: PostWithMeta) => post.visibility === 'local';

export * from './filters';

const getTags = (text?: string) => {
  if (!text) return [];
  return (text.match(hashtagRegex) || []).map((tag) =>
    normalizeHashtagTag(tag.substring(1)),
  );
};

export const extractHashtags = (data: PostDataUnion) => {
  switch (data.type) {
    default:
      return getTags(data?.content);
  }
};

export const extractMentionHandles = (text?: string): string[] => {
  if (!text) {
    return [];
  }

  const handles = new Set<string>();

  for (const word of text.split(/\s+/)) {
    if (!word.startsWith('@')) {
      continue;
    }

    const handle = word.slice(1);

    if (handleRegex.test(handle)) {
      handles.add(handle);
    }
  }

  return [...handles];
};

export const resolveMentionsForPost = async (
  data: PostDataUnion,
): Promise<MentionWithPublicProfile[]> => {
  const byProfileId = new Map<string, MentionWithPublicProfile>();

  for (const handle of extractMentionHandles(data.content)) {
    const profile = await findProfileByHandle(handle);

    if (profile) {
      byProfileId.set(profile.id, { profile, text: `@${handle}` });
    }
  }

  return [...byProfileId.values()];
};

export const entryConnector = connector<Profile, Post, EntryData>(
  collectionInfos.profilesCollection,
  collectionInfos.postsCollection,
  collectionInfos.entriesCollection,
);

export const entryDisconnector = disconnector<Profile, Post>(
  collectionInfos.profilesCollection,
  collectionInfos.postsCollection,
  collectionInfos.entriesCollection,
);

export const replyConnector = connector<Post, Post>(
  collectionInfos.postsCollection,
  collectionInfos.postsCollection,
  collectionInfos.repliesCollection,
);

export const groupConnector = connector<Post, GroupWithMeta>(
  collectionInfos.postsCollection,
  collectionInfos.groupsCollection,
  collectionInfos.postGroupsCollection,
);

export const audienceConnector = connector<Post, Profile>(
  collectionInfos.postsCollection,
  collectionInfos.profilesCollection,
  collectionInfos.audienceCollection,
);

export const audienceConnectionFinder = connectionFinder<Post, Profile>(
  collectionInfos.postsCollection,
  collectionInfos.profilesCollection,
  collectionInfos.audienceCollection,
);

export const hashtagConnector = connector<Post, Hashtag>(
  collectionInfos.postsCollection,
  collectionInfos.hashtagsCollection,
  collectionInfos.postHashtagsCollection,
);

export const hashtagDisconnector = disconnector<Post, Hashtag>(
  collectionInfos.postsCollection,
  collectionInfos.hashtagsCollection,
  collectionInfos.postHashtagsCollection,
);

export const mentionConnector = connector<Post, Profile, MentionData>(
  collectionInfos.postsCollection,
  collectionInfos.profilesCollection,
  collectionInfos.mentionsCollection,
);

export const mentionsConnectionFinder = connectionFinder<Post, Profile>(
  collectionInfos.postsCollection,
  collectionInfos.profilesCollection,
  collectionInfos.mentionsCollection,
);

export const repostConnector = connector<Post, Post>(
  collectionInfos.postsCollection,
  collectionInfos.postsCollection,
  collectionInfos.repostCollection,
);

export const reactionConnector = connector<Profile, Post, ReactionData>(
  collectionInfos.profilesCollection,
  collectionInfos.postsCollection,
  collectionInfos.reactionsCollection,
);

export const reactionDisconnector = disconnector<Profile, Post>(
  collectionInfos.profilesCollection,
  collectionInfos.postsCollection,
  collectionInfos.reactionsCollection,
);

export const bookmarkConnector = connector<Profile, Post>(
  collectionInfos.profilesCollection,
  collectionInfos.postsCollection,
  collectionInfos.bookmarksCollection,
);

export const bookmarkDisconnector = disconnector<Profile, Post>(
  collectionInfos.profilesCollection,
  collectionInfos.postsCollection,
  collectionInfos.bookmarksCollection,
);

export const postSeenConnector = connector<Profile, Post>(
  collectionInfos.profilesCollection,
  collectionInfos.postsCollection,
  collectionInfos.postSeenCollection,
);

const addProfileForEntry = async (
  rawEntry: DbEntry,
): Promise<EntryWithProfile> => ({
  ...rawEntry,
  profile: (await getProfile(rawEntry.profile.id))!,
});

const addProfileForReaction = async (
  rawReaction: DbReaction,
): Promise<ReactionProfile> => ({
  ...rawReaction,
  profile: (await getProfile(rawReaction.profile.id))!,
});

const addProfileForMention = async (
  rawMention: DbMention,
): Promise<MentionWithProfile> => ({
  ...rawMention,
  profile: (await getProfile(rawMention.profile.id))!,
});

export const transformPost = async (
  post: DbPost,
  currentProfile?: { id: string },
): Promise<PostWithMeta> => {
  const entries = post.entries
    ? await Promise.all(post.entries.map(addProfileForEntry))
    : [];
  const reactions = post.reactions
    ? await Promise.all(post.reactions.map(addProfileForReaction))
    : [];
  const audience = post.audience
    ? ((await Promise.all(
        post.audience.map((p) => getProfile(p.id)),
      )) as ProfileWithMeta[])
    : [];
  const mentions = post.mentions
    ? await Promise.all(post.mentions.map(addProfileForMention))
    : [];
  return {
    ...post,
    data: post.data ? normalizePostDataFromDb(post.data) : post.data,
    seen: currentProfile ? post.seen : undefined,
    replyTo: post.replyTo
      ? await transformPost(post.replyTo, currentProfile)
      : undefined,
    repost: post.repost
      ? await transformPost(post.repost, currentProfile)
      : undefined,
    rsvps: entries
      .filter((entry) => entry.type === 'rsvp')
      .map((entry) => ({
        profile: entry.profile,
        response: entry.data.response,
        createdAt: entry.createdAt,
      })),
    audience,
    mentions,
    profile: entries.find((entry) => entry.type === 'create')?.profile!,
    entries,
    reactions,
  };
};

export const toFilteredPostsList = async (
  queryResult: PgQueryResult<DbPost>,
  options: {
    authData: AuthorizationData;
    limit?: number;
    offset?: number;
    filters?: ObjectFilter<PostWithMeta>[];
  },
) => {
  const { authData, limit = 100, offset = 0, filters = [] } = options;
  const { db } = await allpeepDb();
  const config = await capabilitiesConfig();
  return filterAndTransform(queryResult, db, {
    filter: composeFilters(canReadPost(config, authData), ...filters),
    transform: (post) => transformPost(post, authData.profile),
    limit,
    offset,
  });
};
