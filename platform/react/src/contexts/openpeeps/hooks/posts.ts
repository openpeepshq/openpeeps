import type { OpenpeepsClient } from '@openpeeps/client';
import {
  apiHook,
  payloadMutation,
  noPayloadMutation,
  infiniteOffsetQueryApiHook,
  infiniteChronologicalQueryApiHook,
} from '../helpers';
import type { ChronologicalInfiniteQueryParams, PostType, PublicPost } from '@openpeeps/common';


type EventFeedHook = ReturnType<typeof infiniteOffsetQueryApiHook<PublicPost[], undefined, { offset?: number, limit: number }>>;

const eventFeeds = (client: OpenpeepsClient): {
  useUpcomingEventsFeed: () => EventFeedHook;
  useCurrentEventsFeed: () => EventFeedHook;
  usePastEventsFeed: () => EventFeedHook;
  useMyUpcomingEventsFeed: () => EventFeedHook;
  useMyCurrentEventsFeed: () => EventFeedHook;
  useMyPastEventsFeed: () => EventFeedHook;
  useGroupUpcomingEventsFeed: (groupId: string) => EventFeedHook;
  useGroupPastEventsFeed: (groupId: string) => EventFeedHook;
} => ({
  useUpcomingEventsFeed: (pageSize: number | undefined = 15) => infiniteOffsetQueryApiHook(client.posts.feeds.events.upcoming, { pageSize, queryParams: { limit: pageSize } }),
  useCurrentEventsFeed: (pageSize: number | undefined = 15) => infiniteOffsetQueryApiHook(client.posts.feeds.events.current, { pageSize, queryParams: { limit: pageSize } }),
  usePastEventsFeed: (pageSize: number | undefined = 15) => infiniteOffsetQueryApiHook(client.posts.feeds.events.past, { pageSize, queryParams: { limit: pageSize } }),
  useMyUpcomingEventsFeed: (pageSize: number | undefined = 15) => infiniteOffsetQueryApiHook(client.posts.feeds.events.my.upcoming, { pageSize, queryParams: { limit: pageSize } }),
  useMyCurrentEventsFeed: (pageSize: number | undefined = 15) => infiniteOffsetQueryApiHook(client.posts.feeds.events.my.current, { pageSize, queryParams: { limit: pageSize } }),
  useMyPastEventsFeed: (pageSize: number | undefined = 15) => infiniteOffsetQueryApiHook(client.posts.feeds.events.my.past, { pageSize, queryParams: { limit: pageSize } }),
  useGroupUpcomingEventsFeed: (groupId: string) => infiniteOffsetQueryApiHook(client.posts.feeds.events.group.upcoming, { pathParams: { groupId }, pageSize: 15 }),
  useGroupPastEventsFeed: (groupId: string) => infiniteOffsetQueryApiHook(client.posts.feeds.events.group.past, { pathParams: { groupId }, pageSize: 15 }),
});

type EventFeeds = ReturnType<typeof eventFeeds>;

const jamFeeds = (client: OpenpeepsClient) => ({
  useUpcomingJamsFeed: () => infiniteOffsetQueryApiHook(client.posts.feeds.jams.upcoming),
  usePastJamsFeed: () => infiniteOffsetQueryApiHook(client.posts.feeds.jams.past),
  useMyUpcomingJamsFeed: () => infiniteOffsetQueryApiHook(client.posts.feeds.jams.my.upcoming),
  useMyPastJamsFeed: () => infiniteOffsetQueryApiHook(client.posts.feeds.jams.my.past),
});

type JamFeeds = ReturnType<typeof jamFeeds>;


const postFeeds = (client: OpenpeepsClient) => ({
  useLocalFeed: (props: ChronologicalInfiniteQueryParams) => infiniteChronologicalQueryApiHook(client.posts.feeds.local, { queryParams: props }),
  useMyFeed: (props: ChronologicalInfiniteQueryParams) => infiniteChronologicalQueryApiHook(client.posts.feeds.my, { queryParams: props }),
});

type PostFeeds = ReturnType<typeof postFeeds>;

const postFinders = (client: OpenpeepsClient) => ({
  usePosts: (props: ChronologicalInfiniteQueryParams) => infiniteChronologicalQueryApiHook(client.posts.list, { queryParams: props }),
  usePostsByType: (type: PostType, props: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.posts.listByType, { pathParams: { type }, queryParams: props }),
  usePostsByHashtag: (hashtag: string, props: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.posts.listByHashtag, { pathParams: { hashtag }, queryParams: props }),
  usePostsByGroup: (id: string, props: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.posts.listByGroup, { pathParams: { id }, queryParams: props }),
  usePostsByProfile: (id: string, props: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.posts.listByProfile, { pathParams: { id }, queryParams: props }),
  useBookmarkedPosts: (props: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.posts.listBookmarks, { queryParams: props }),
  usePost: (id: string) =>
    apiHook(client.posts.findById, { pathParams: { id } }),
  usePostContext: (id: string) =>
    apiHook(client.posts.context, { pathParams: { id } }),
  usePostReposts: (id: string) =>
    apiHook(client.posts.reposts, { pathParams: { id } }),
  useUnseenPostCounts: () =>
    apiHook(client.posts.unseenCounts),
});

type PostFinders = ReturnType<typeof postFinders>;

const postMutators = (client: OpenpeepsClient) => ({
  createPostAction: payloadMutation(client.posts.create, [['posts']]),
  updatePostAction: payloadMutation(client.posts.update, [['posts']]),
  deletePostAction: noPayloadMutation(client.posts.delete, [['posts']]),
  reactToPostAction: payloadMutation(client.posts.react, [['posts']]),
  retractPostReactionAction: noPayloadMutation(client.posts.retractReaction, [
    ['posts'],
  ]),
  bookmarkPostAction: noPayloadMutation(client.posts.bookmark, [['posts'], ['profiles', 'current', 'bookmarkedIds']]),
  unbookmarkPostAction: noPayloadMutation(client.posts.unbookmark, [['posts'], ['profiles', 'current', 'bookmarkedIds']]),
  markPostsSeenAction: payloadMutation(client.posts.seen, [['posts']]),
  repostPostAction: noPayloadMutation(client.posts.repost, [['posts']]),
  voteOnPostAction: payloadMutation(client.posts.vote, [['posts']]),
  rsvpToEventAction: payloadMutation(client.posts.rsvp, [['posts'], ['rsvp']]),
});

type PostMutators = ReturnType<typeof postMutators>;

export type PostHooks = PostFeeds & PostFinders & PostMutators & EventFeeds & JamFeeds;

export const postHooks = (client: OpenpeepsClient): PostHooks => ({
  ...postFeeds(client),
  ...postFinders(client),
  ...postMutators(client),
  ...eventFeeds(client),
  ...jamFeeds(client),
});
