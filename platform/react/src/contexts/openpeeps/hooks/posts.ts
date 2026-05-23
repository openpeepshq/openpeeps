import type { OpenpeepsClient } from '@openpeeps/client';
import {
  apiHook,
  payloadMutation,
  noPayloadMutation,
  infiniteOffsetQueryApiHook,
  infiniteChronologicalQueryApiHook,
} from '../helpers';
import type {
  ChronologicalInfiniteQueryParams,
  PostContext,
  PostType,
  PublicPost,
  UnseenPostCounts,
} from '@openpeeps/common';

type EventFeedHook = ReturnType<
  typeof infiniteOffsetQueryApiHook<
    PublicPost[],
    undefined,
    { offset?: number; limit: number }
  >
>;

const eventFeeds = (
  client: OpenpeepsClient,
): {
  useUpcomingEventsFeed: () => EventFeedHook;
  useCurrentEventsFeed: () => EventFeedHook;
  usePastEventsFeed: () => EventFeedHook;
  useMyUpcomingEventsFeed: () => EventFeedHook;
  useMyCurrentEventsFeed: () => EventFeedHook;
  useMyPastEventsFeed: () => EventFeedHook;
  useGroupUpcomingEventsFeed: (groupId: string) => EventFeedHook;
  useGroupPastEventsFeed: (groupId: string) => EventFeedHook;
} => ({
  useUpcomingEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.upcoming, {
      pageSize,
      queryParams: { limit: pageSize },
    }),
  useCurrentEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.current, {
      pageSize,
      queryParams: { limit: pageSize },
    }),
  usePastEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.past, {
      pageSize,
      queryParams: { limit: pageSize },
    }),
  useMyUpcomingEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.my.upcoming, {
      pageSize,
      queryParams: { limit: pageSize },
    }),
  useMyCurrentEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.my.current, {
      pageSize,
      queryParams: { limit: pageSize },
    }),
  useMyPastEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.my.past, {
      pageSize,
      queryParams: { limit: pageSize },
    }),
  useGroupUpcomingEventsFeed: (groupId: string) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.group.upcoming, {
      pathParams: { groupId },
      pageSize: 15,
    }),
  useGroupPastEventsFeed: (groupId: string) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.group.past, {
      pathParams: { groupId },
      pageSize: 15,
    }),
});

type EventFeeds = ReturnType<typeof eventFeeds>;

const jamFeeds = (client: OpenpeepsClient) => ({
  useUpcomingJamsFeed: () =>
    infiniteOffsetQueryApiHook(client.posts.feeds.jams.upcoming),
  usePastJamsFeed: () =>
    infiniteOffsetQueryApiHook(client.posts.feeds.jams.past),
  useMyUpcomingJamsFeed: () =>
    infiniteOffsetQueryApiHook(client.posts.feeds.jams.my.upcoming),
  useMyPastJamsFeed: () =>
    infiniteOffsetQueryApiHook(client.posts.feeds.jams.my.past),
});

type JamFeeds = ReturnType<typeof jamFeeds>;

const postFeeds = (client: OpenpeepsClient) => ({
  useLocalFeed: (props: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.posts.feeds.local, {
      queryParams: props,
    }),
  useMyFeed: (props: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.posts.feeds.my, {
      queryParams: props,
    }),
});

type PostFeeds = ReturnType<typeof postFeeds>;

type PostsInfiniteHook = ReturnType<
  typeof infiniteChronologicalQueryApiHook<
    PublicPost[],
    Record<string, string> | undefined,
    Record<string, string> | undefined
  >
>;

type PostQueryHook<T> = ReturnType<typeof apiHook<T, { id: string }, undefined>>;

type PostFinders = {
  usePosts: (props: ChronologicalInfiniteQueryParams) => PostsInfiniteHook;
  usePostsByType: (
    type: PostType,
    props: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  usePostsByHashtag: (
    hashtag: string,
    props: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  usePostsByGroup: (
    id: string,
    props: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  usePostsByProfile: (
    id: string,
    props: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  useBookmarkedPosts: (
    props: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  usePost: (id: string) => PostQueryHook<PublicPost>;
  usePostContext: (id: string) => PostQueryHook<PostContext>;
  usePostReposts: (id: string) => PostQueryHook<PublicPost[]>;
  useUnseenPostCounts: () => ReturnType<typeof apiHook<UnseenPostCounts>>;
};

// Explicit return type annotation keeps `tsc` from trying to serialize the
// deeply-inferred shape into `.d.ts` (TS7056 otherwise).
const postFinders = (client: OpenpeepsClient): PostFinders => ({
  usePosts: (props) =>
    infiniteChronologicalQueryApiHook(client.posts.list, {
      queryParams: props,
    }) as PostsInfiniteHook,
  usePostsByType: (type, props) =>
    infiniteChronologicalQueryApiHook(client.posts.listByType, {
      pathParams: { type },
      queryParams: props,
    }) as PostsInfiniteHook,
  usePostsByHashtag: (hashtag, props) =>
    infiniteChronologicalQueryApiHook(client.posts.listByHashtag, {
      pathParams: { hashtag },
      queryParams: props,
    }) as PostsInfiniteHook,
  usePostsByGroup: (id, props) =>
    infiniteChronologicalQueryApiHook(client.posts.listByGroup, {
      pathParams: { id },
      queryParams: props,
    }) as PostsInfiniteHook,
  usePostsByProfile: (id, props) =>
    infiniteChronologicalQueryApiHook(client.posts.listByProfile, {
      pathParams: { id },
      queryParams: props,
      enabled: !!id,
    }) as PostsInfiniteHook,
  useBookmarkedPosts: (props) =>
    infiniteChronologicalQueryApiHook(client.posts.listBookmarks, {
      queryParams: props,
    }) as PostsInfiniteHook,
  usePost: (id) =>
    apiHook(client.posts.findById, {
      pathParams: { id },
    }) as PostQueryHook<PublicPost>,
  usePostContext: (id) =>
    apiHook(client.posts.context, {
      pathParams: { id },
    }) as PostQueryHook<PostContext>,
  usePostReposts: (id) =>
    apiHook(client.posts.reposts, {
      pathParams: { id },
    }) as PostQueryHook<PublicPost[]>,
  useUnseenPostCounts: () => apiHook(client.posts.unseenCounts),
});

const postMutators = (client: OpenpeepsClient) => ({
  createPostAction: payloadMutation(client.posts.create, [['posts']]),
  updatePostAction: payloadMutation(client.posts.update, [['posts']]),
  deletePostAction: noPayloadMutation(client.posts.delete, [['posts']]),
  reactToPostAction: payloadMutation(client.posts.react, [['posts']]),
  retractPostReactionAction: noPayloadMutation(client.posts.retractReaction, [
    ['posts'],
  ]),
  bookmarkPostAction: noPayloadMutation(client.posts.bookmark, [
    ['posts'],
    ['profiles', 'current', 'bookmarkedIds'],
  ]),
  unbookmarkPostAction: noPayloadMutation(client.posts.unbookmark, [
    ['posts'],
    ['profiles', 'current', 'bookmarkedIds'],
  ]),
  markPostsSeenAction: payloadMutation(client.posts.seen, [['posts']]),
  repostPostAction: noPayloadMutation(client.posts.repost, [['posts']]),
  voteOnPostAction: payloadMutation(client.posts.vote, [['posts']]),
  rsvpToEventAction: payloadMutation(client.posts.rsvp, [
    ['posts'],
    ['rsvp'],
  ]),
});

type PostMutators = ReturnType<typeof postMutators>;

export type PostHooks = PostFeeds &
  PostFinders &
  PostMutators &
  EventFeeds &
  JamFeeds;

export const postHooks = (client: OpenpeepsClient): PostHooks => ({
  ...postFeeds(client),
  ...postFinders(client),
  ...postMutators(client),
  ...eventFeeds(client),
  ...jamFeeds(client),
});
