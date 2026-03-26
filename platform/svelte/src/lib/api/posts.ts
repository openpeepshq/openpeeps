import type { ChronologicalInfiniteQueryParams, PublicPost, PostType } from '@openpeeps/common/types';

import {
	client,
	payloadMutation,
	noPayloadMutation,
	simpleStore,
	infiniteChronologicalStore,
	infiniteOffsetStore
} from './helpers';

export const localFeedStore = () => simpleStore(client.posts.feeds.local);

export const infiniteLocalFeedStore = (props: ChronologicalInfiniteQueryParams) =>
	infiniteChronologicalStore(client.posts.feeds.local, { queryParams: props });

export const myFeedStore = () => simpleStore(client.posts.feeds.my);
export const infiniteMyFeedStore = (props: ChronologicalInfiniteQueryParams) => infiniteChronologicalStore(client.posts.feeds.my, { queryParams: props });

export const getPostStore = (id: string) =>
	simpleStore(client.posts.findById, { pathParams: { id } });
export const getPostsByProfileStore = (id: string) =>
	simpleStore(client.posts.listByProfile, { pathParams: { id } });
export const infiniteBookmarkedPostsStore = (props: ChronologicalInfiniteQueryParams) =>
	infiniteChronologicalStore(client.posts.listBookmarks, { queryParams: props });
export const getPostContext = (id: string) =>
	simpleStore(client.posts.context, { pathParams: { id } });

export const getPostListStore = (type: PostType) =>
	simpleStore(client.posts.listByType, { pathParams: { type } });

export const infiniteGetPostListStore = (type: PostType, props: ChronologicalInfiniteQueryParams) =>
	infiniteChronologicalStore(client.posts.listByType, { pathParams: { type }, queryParams: props });

export const getPostRepostsStore = (post: PublicPost) =>
	simpleStore(client.posts.reposts, { pathParams: { id: post.id } });

export const getPostsByTypeStore = (type: PostType, props: ChronologicalInfiniteQueryParams) =>
	infiniteChronologicalStore(client.posts.listByType, { pathParams: { type }, queryParams: props });

export const reactToPostMutation = payloadMutation(client.posts.react, {
	queryKeys: [['posts'], ['profiles', 'current', 'reposts']]
});

export const retractReactionMutation = noPayloadMutation(client.posts.retractReaction, {
	queryKeys: [['posts'], ['profiles', 'current', 'reposts']]
});

export const bookmarkPostMutation = noPayloadMutation(client.posts.bookmark, {
	queryKeys: [['posts'], ['profiles', 'current', 'bookmarkedIds']]
});

export const unbookmarkPostMutation = noPayloadMutation(client.posts.unbookmark, {
	queryKeys: [['posts'], ['profiles', 'current', 'bookmarkedIds']]
});

export const createPostMutation = payloadMutation(client.posts.create, {
	queryKeys: [['posts']]
});

export const updatePostMutation = payloadMutation(client.posts.update, {
	queryKeys: [['posts']]
});

export const repostMutation = noPayloadMutation(client.posts.repost, {
	queryKeys: [['posts'], ['profiles']]
});

export const retractRepostMutation = noPayloadMutation(client.posts.delete, {
	queryKeys: [['posts'], ['profiles']]
});

export const deletePostMutation = noPayloadMutation(client.posts.delete, {
	queryKeys: [['posts']]
});

export const votePollMutation = payloadMutation(client.posts.vote, {
	queryKeys: [['posts']]
});

export const hashtagFeedStore = (hashtag: string) =>
	simpleStore(client.posts.listByHashtag, { pathParams: { hashtag } });

export const infiniteHashtagFeedStore = (hashtag: string, props: ChronologicalInfiniteQueryParams) =>
	infiniteChronologicalStore(client.posts.listByHashtag, { pathParams: { hashtag }, queryParams: props });

export const groupFeedStore = (id: string) =>
	simpleStore(client.posts.listByGroup, { pathParams: { id } });

export const infiniteGroupFeedStore = (id: string, props: ChronologicalInfiniteQueryParams) =>
	infiniteChronologicalStore(client.posts.listByGroup, { pathParams: { id }, queryParams: props });

export const groupEventsFeedStore = (groupId: string, pageSize: number) => infiniteOffsetStore(client.posts.feeds.events.group, { pathParams: { groupId }, pageSize });

export const upcomingEventsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.events.upcoming, { pageSize });
export const currentEventsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.events.current, { pageSize });
export const pastEventsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.events.past, { pageSize });

export const myUpcomingEventsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.events.my.upcoming, { pageSize });
export const myCurrentEventsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.events.my.current, { pageSize });
export const myPastEventsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.events.my.past, { pageSize });

export const upcomingJamsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.jams.upcoming, { pageSize });
export const pastJamsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.jams.past, { pageSize });

export const myUpcomingJamsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.jams.my.upcoming, { pageSize });
export const myPastJamsFeedStore = (pageSize: number) => infiniteOffsetStore(client.posts.feeds.jams.my.past, { pageSize });

export const upcomingGroupEventsFeedStore = (groupId: string, pageSize: number) => infiniteOffsetStore(client.posts.feeds.events.group.upcoming, { pathParams: { groupId }, pageSize });
export const pastGroupEventsFeedStore = (groupId: string, pageSize: number) => infiniteOffsetStore(client.posts.feeds.events.group.past, { pathParams: { groupId }, pageSize });

export const eventRsvpMutation = payloadMutation(client.posts.rsvp, {
	queryKeys: [['posts'], ['rsvp']]
});