import type { FetchClient } from '@openpeepshq/fetch-client';
import {
  type JamRecording,
  type RSVP,
  type ChronologicalInfiniteQueryParams,
  type PostContext,
  type PostCreationData,
  type PostDataUnion,
  type PostType,
  type ReactionData,
  type SuccessResponse,
  type OffsetInfiniteQueryParams,
  type PublicPost,
  type UnseenPostCounts,
} from '@openpeepshq/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';
import type {
  OpenpeepsNoPayloadEndpoint,
  OpenpeepsPayloadEndpoint,
} from '../types';

type PostsSeenRequest = {
  postIds: string[];
};

type ChronologicalPosts = OpenpeepsNoPayloadEndpoint<
  PublicPost[],
  undefined,
  ChronologicalInfiniteQueryParams
>;

type OffsetPosts = OpenpeepsNoPayloadEndpoint<
  PublicPost[],
  undefined,
  OffsetInfiniteQueryParams
>;

type GroupOffsetPosts = OpenpeepsNoPayloadEndpoint<
  PublicPost[],
  { groupId: string },
  OffsetInfiniteQueryParams
>;

type Finders = {
  list: ChronologicalPosts;
  listByType: OpenpeepsNoPayloadEndpoint<
    PublicPost[],
    { type: PostType },
    ChronologicalInfiniteQueryParams
  >;
  listByHashtag: OpenpeepsNoPayloadEndpoint<
    PublicPost[],
    { hashtag: string },
    ChronologicalInfiniteQueryParams
  >;
  listByGroup: OpenpeepsNoPayloadEndpoint<
    PublicPost[],
    { id: string },
    ChronologicalInfiniteQueryParams
  >;
  listByProfile: OpenpeepsNoPayloadEndpoint<
    PublicPost[],
    { id: string },
    ChronologicalInfiniteQueryParams
  >;
  listBookmarks: ChronologicalPosts;
  findById: OpenpeepsNoPayloadEndpoint<PublicPost, { id: string }>;
  context: OpenpeepsNoPayloadEndpoint<PostContext, { id: string }>;
  reposts: OpenpeepsNoPayloadEndpoint<PublicPost[], { id: string }>;
  recordings: OpenpeepsNoPayloadEndpoint<JamRecording[], { id: string }>;
  publishRecordingReply: OpenpeepsNoPayloadEndpoint<
    JamRecording,
    { id: string; recordingId: string }
  >;
  deleteRecording: OpenpeepsNoPayloadEndpoint<
    SuccessResponse,
    { id: string; recordingId: string }
  >;
  unseenCounts: OpenpeepsNoPayloadEndpoint<UnseenPostCounts>;
};

// Explicit return types keep `tsc` from serializing the expanded PublicPost
// endpoint shape into `.d.ts` (TS7056 otherwise).
const finders = (rawClient: FetchClient): Finders => ({
  list: allpeepNoPayloadEndpoint<
    PublicPost[],
    undefined,
    ChronologicalInfiniteQueryParams
  >(rawClient, '/posts'),
  listByType: allpeepNoPayloadEndpoint<
    PublicPost[],
    { type: PostType },
    ChronologicalInfiniteQueryParams
  >(rawClient, '/posts/by-type/:type'),
  listByHashtag: allpeepNoPayloadEndpoint<
    PublicPost[],
    { hashtag: string },
    ChronologicalInfiniteQueryParams
  >(rawClient, '/posts/by-hashtag/:hashtag'),
  listByGroup: allpeepNoPayloadEndpoint<
    PublicPost[],
    { id: string },
    ChronologicalInfiniteQueryParams
  >(rawClient, '/posts/by-group/:id'),
  listByProfile: allpeepNoPayloadEndpoint<
    PublicPost[],
    { id: string },
    ChronologicalInfiniteQueryParams
  >(rawClient, '/posts/by-profile/:id'),
  listBookmarks: allpeepNoPayloadEndpoint<
    PublicPost[],
    undefined,
    ChronologicalInfiniteQueryParams
  >(rawClient, '/posts/bookmarks'),
  findById: allpeepNoPayloadEndpoint<PublicPost, { id: string }>(
    rawClient,
    '/posts/:id',
  ),
  context: allpeepNoPayloadEndpoint<PostContext, { id: string }>(
    rawClient,
    '/posts/:id/context',
  ),
  reposts: allpeepNoPayloadEndpoint<PublicPost[], { id: string }>(
    rawClient,
    '/posts/:id/reposts',
  ),
  recordings: allpeepNoPayloadEndpoint<JamRecording[], { id: string }>(
    rawClient,
    '/posts/:id/recordings',
  ),
  publishRecordingReply: allpeepNoPayloadEndpoint<
    JamRecording,
    { id: string; recordingId: string }
  >(rawClient, '/posts/:id/recordings/:recordingId/reply', 'post'),
  deleteRecording: allpeepNoPayloadEndpoint<
    SuccessResponse,
    { id: string; recordingId: string }
  >(rawClient, '/posts/:id/recordings/:recordingId', 'delete'),
  unseenCounts: allpeepNoPayloadEndpoint<UnseenPostCounts>(
    rawClient,
    '/posts/unseen/counts',
  ),
});

const eventFeeds = (rawClient: FetchClient): EventFeeds => ({
  events: {
    my: {
      upcoming: allpeepNoPayloadEndpoint<
        PublicPost[],
        undefined,
        OffsetInfiniteQueryParams
      >(rawClient, '/posts/feeds/events/my/upcoming'),
      current: allpeepNoPayloadEndpoint<
        PublicPost[],
        undefined,
        OffsetInfiniteQueryParams
      >(rawClient, '/posts/feeds/events/my/current'),
      past: allpeepNoPayloadEndpoint<
        PublicPost[],
        undefined,
        OffsetInfiniteQueryParams
      >(rawClient, '/posts/feeds/events/my/past'),
    },
    upcoming: allpeepNoPayloadEndpoint<
      PublicPost[],
      undefined,
      OffsetInfiniteQueryParams
    >(rawClient, '/posts/feeds/events/upcoming'),
    current: allpeepNoPayloadEndpoint<
      PublicPost[],
      undefined,
      OffsetInfiniteQueryParams
    >(rawClient, '/posts/feeds/events/current'),
    past: allpeepNoPayloadEndpoint<
      PublicPost[],
      undefined,
      OffsetInfiniteQueryParams
    >(rawClient, '/posts/feeds/events/past'),
    group: {
      upcoming: allpeepNoPayloadEndpoint<
        PublicPost[],
        { groupId: string },
        OffsetInfiniteQueryParams
      >(rawClient, '/posts/feeds/events/by-group/:groupId/upcoming'),
      past: allpeepNoPayloadEndpoint<
        PublicPost[],
        { groupId: string },
        OffsetInfiniteQueryParams
      >(rawClient, '/posts/feeds/events/by-group/:groupId/past'),
    },
  },
});

type EventFeeds = {
  events: {
    my: {
      upcoming: OffsetPosts;
      current: OffsetPosts;
      past: OffsetPosts;
    };
    upcoming: OffsetPosts;
    current: OffsetPosts;
    past: OffsetPosts;
    group: {
      upcoming: GroupOffsetPosts;
      past: GroupOffsetPosts;
    };
  };
};

const jamFeeds = (rawClient: FetchClient): JamFeeds => ({
  jams: {
    upcoming: allpeepNoPayloadEndpoint<
      PublicPost[],
      undefined,
      OffsetInfiniteQueryParams
    >(rawClient, '/posts/feeds/jams/upcoming'),
    past: allpeepNoPayloadEndpoint<
      PublicPost[],
      undefined,
      OffsetInfiniteQueryParams
    >(rawClient, '/posts/feeds/jams/past'),
    my: {
      upcoming: allpeepNoPayloadEndpoint<
        PublicPost[],
        undefined,
        OffsetInfiniteQueryParams
      >(rawClient, '/posts/feeds/jams/my/upcoming'),
      past: allpeepNoPayloadEndpoint<
        PublicPost[],
        undefined,
        OffsetInfiniteQueryParams
      >(rawClient, '/posts/feeds/jams/my/past'),
    },
  },
});

type JamFeeds = {
  jams: {
    upcoming: OffsetPosts;
    past: OffsetPosts;
    my: {
      upcoming: OffsetPosts;
      past: OffsetPosts;
    };
  };
};

const postFeeds = (rawClient: FetchClient): PostFeeds => ({
  my: allpeepNoPayloadEndpoint<
    PublicPost[],
    undefined,
    ChronologicalInfiniteQueryParams
  >(rawClient, '/posts/feeds/my'),
  local: allpeepNoPayloadEndpoint<
    PublicPost[],
    undefined,
    ChronologicalInfiniteQueryParams
  >(rawClient, '/posts/feeds/local'),
});

type PostFeeds = {
  my: ChronologicalPosts;
  local: ChronologicalPosts;
};

type Feeds = { feeds: PostFeeds & EventFeeds & JamFeeds };

const feeds = (rawClient: FetchClient): Feeds => ({
  feeds: {
    ...postFeeds(rawClient),
    ...eventFeeds(rawClient),
    ...jamFeeds(rawClient),
  },
});

type Mutators = {
  create: OpenpeepsPayloadEndpoint<PublicPost, PostCreationData>;
  update: OpenpeepsPayloadEndpoint<PublicPost, PostDataUnion, { id: string }>;
  delete: OpenpeepsNoPayloadEndpoint<SuccessResponse, { id: string }>;
  react: OpenpeepsPayloadEndpoint<
    SuccessResponse,
    ReactionData,
    { id: string }
  >;
  retractReaction: OpenpeepsNoPayloadEndpoint<SuccessResponse, { id: string }>;
  bookmark: OpenpeepsNoPayloadEndpoint<SuccessResponse, { id: string }>;
  unbookmark: OpenpeepsNoPayloadEndpoint<SuccessResponse, { id: string }>;
  seen: OpenpeepsPayloadEndpoint<SuccessResponse, PostsSeenRequest>;
  seenByGroup: OpenpeepsNoPayloadEndpoint<SuccessResponse, { groupId: string }>;
  repost: OpenpeepsNoPayloadEndpoint<SuccessResponse, { id: string }>;
  vote: OpenpeepsPayloadEndpoint<
    SuccessResponse,
    { selection: number[] },
    { id: string }
  >;
  rsvp: OpenpeepsPayloadEndpoint<SuccessResponse, RSVP, { id: string }>;
  rsvpManage: OpenpeepsPayloadEndpoint<
    SuccessResponse,
    { response: 'removed' | 'yes'; recurrenceId?: string },
    { id: string; profileId: string }
  >;
};

const mutators = (rawClient: FetchClient): Mutators => ({
  create: allpeepPayloadEndpoint<PublicPost, PostCreationData>(
    rawClient,
    '/posts',
  ),
  update: allpeepPayloadEndpoint<PublicPost, PostDataUnion, { id: string }>(
    rawClient,
    '/posts/:id',
    'put',
  ),
  delete: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
    rawClient,
    '/posts/:id',
    'delete',
  ),
  react: allpeepPayloadEndpoint<SuccessResponse, ReactionData, { id: string }>(
    rawClient,
    '/posts/:id/react',
  ),
  retractReaction: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
    rawClient,
    '/posts/:id/react',
    'delete',
  ),
  bookmark: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
    rawClient,
    '/posts/:id/bookmark',
    'post',
  ),
  unbookmark: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
    rawClient,
    '/posts/:id/bookmark',
    'delete',
  ),
  seen: allpeepPayloadEndpoint<SuccessResponse, PostsSeenRequest>(
    rawClient,
    '/posts/seen',
    'post',
  ),
  seenByGroup: allpeepNoPayloadEndpoint<SuccessResponse, { groupId: string }>(
    rawClient,
    '/posts/seen/by-group/:groupId',
    'post',
  ),
  repost: allpeepNoPayloadEndpoint<SuccessResponse, { id: string }>(
    rawClient,
    '/posts/:id/reposts',
    'post',
  ),
  vote: allpeepPayloadEndpoint<
    SuccessResponse,
    { selection: number[] },
    { id: string }
  >(rawClient, '/posts/:id/vote'),
  rsvp: allpeepPayloadEndpoint<SuccessResponse, RSVP, { id: string }>(
    rawClient,
    '/posts/:id/rsvp',
    'post',
  ),
  rsvpManage: allpeepPayloadEndpoint<
    SuccessResponse,
    { response: 'removed' | 'yes'; recurrenceId?: string },
    { id: string; profileId: string }
  >(rawClient, '/posts/:id/rsvp/:profileId', 'post'),
});

type PostsEndpoints = Finders & Mutators & Feeds;

export const posts = (rawClient: FetchClient): PostsEndpoints => ({
  ...finders(rawClient),
  ...mutators(rawClient),
  ...feeds(rawClient),
});
