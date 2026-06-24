import type { FetchClient } from '@openpeeps/fetch-client';
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
} from '@openpeeps/common';
import { allpeepNoPayloadEndpoint, allpeepPayloadEndpoint } from './helpers';

type PostsSeenRequest = {
  postIds: string[];
};

const finders = (rawClient: FetchClient) => ({
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

const eventFeeds = (rawClient: FetchClient) => ({
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

type EventFeeds = ReturnType<typeof eventFeeds>;

const jamFeeds = (rawClient: FetchClient) => ({
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

type JamFeeds = ReturnType<typeof jamFeeds>;

const postFeeds = (rawClient: FetchClient) => ({
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

type PostFeeds = ReturnType<typeof postFeeds>;

type Feeds = { feeds: PostFeeds & EventFeeds & JamFeeds };

const feeds = (rawClient: FetchClient): Feeds => ({
  feeds: {
    ...postFeeds(rawClient),
    ...eventFeeds(rawClient),
    ...jamFeeds(rawClient),
  },
});

const mutators = (rawClient: FetchClient) => ({
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
    { response: 'removed' | 'yes' },
    { id: string; profileId: string }
  >(rawClient, '/posts/:id/rsvp/:profileId', 'post'),
});

type PostsEndpoints = ReturnType<typeof finders> &
  ReturnType<typeof mutators> &
  ReturnType<typeof feeds>;

export const posts = (rawClient: FetchClient): PostsEndpoints => ({
  ...finders(rawClient),
  ...mutators(rawClient),
  ...feeds(rawClient),
});
