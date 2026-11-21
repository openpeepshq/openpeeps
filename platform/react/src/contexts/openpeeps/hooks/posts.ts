import type { InfiniteData } from '@tanstack/react-query';
import type { OpenpeepsClient } from '@openpeepshq/client';
import type { ParametersType } from '@openpeepshq/fetch-client/types';
import {
  applyAgendaWindowFilter,
  uniquePosts,
  type EventsAgendaWindow,
} from '../../../components/post/feed/events/eventCalendar';
import {
  apiHook,
  payloadMutation,
  noPayloadMutation,
  payloadPostsReadMutation,
  noPayloadPostsReadMutation,
  infiniteOffsetQueryApiHook,
  infiniteChronologicalQueryApiHook,
} from '../helpers';
import type {
  ChronologicalInfiniteQueryParams,
  EventRangeQueryParams,
  JamRecording,
  PostContext,
  PostType,
  PublicPost,
  UnseenPostCounts,
} from '@openpeepshq/common';
import { EVENT_RANGE_DEFAULT_LIMIT } from '@openpeepshq/common/types';

type EventFeedHook = ReturnType<
  typeof infiniteOffsetQueryApiHook<
    PublicPost[],
    undefined,
    { offset?: number; limit: number }
  >
>;

type CalendarRangeHook<P extends ParametersType> = (
  params: { from: string; to: string },
  enabled?: boolean,
) => ReturnType<
  typeof apiHook<
    PublicPost[],
    P & Record<string, string>,
    EventRangeQueryParams
  >
>;

/** Page size for the calendar date-range queries; the shared server/page constant. */
export const CALENDAR_RANGE_LIMIT = EVENT_RANGE_DEFAULT_LIMIT;

/**
 * Jam feeds (server-side) run the same event-agenda SQL with `jamOnly: true`
 * (`platform/core/src/posts/finders.ts` → `listUpcomingEventsFeed`), so the
 * event window predicate is correct for jams too — no separate selector is
 * needed.
 *
 * Event/jam agenda feeds carry their window in the endpoint path (events vs
 * jams, upcoming/current/past, mine, group). The selector receives the whole
 * `InfiniteData` — not one page at a time — because deduplication
 * (`uniquePosts`) and paging coverage are properties of the accumulated
 * series set, and a series spanning pages must be evaluated as a whole.
 * The filter is dedupe-safe: rows of the same series collapse to one before
 * the predicate runs, so a series whose rows straddle two pages keeps its
 * in-window rows exactly once and no page boundary can split it.
 *
 * The filter compares against the time the selector runs; the refetch
 * interval in `agendaOptions` is what re-runs the selector while the
 * user sits on the tab.
 */
const agendaSelect =
  (window: EventsAgendaWindow) =>
  (data: InfiniteData<PublicPost[]>): InfiniteData<PublicPost[]> => ({
    ...data,
    pages: [applyAgendaWindowFilter(uniquePosts(data.pages), window)],
  });

/**
 * Stable module-scope selectors. A fresh closure per render would defeat
 * TanStack Query's select memoization and re-run the window filter on every
 * render of every consumer; stable references keep it memoized until `data`
 * changes. The select re-runs on every refetch (tab switch, pull to
 * refresh, focus) and on the periodic interval below, so it then compares
 * against a fresh `now`.
 */
const AGENDA_SELECTS = {
  upcoming: agendaSelect('upcoming'),
  current: agendaSelect('current'),
  past: agendaSelect('past'),
} as const;

/**
 * TanStack Query re-runs `select` only when `data` changes — it never
 * refetches when time passes. Without a periodic refetch, a user sitting on
 * the Upcoming tab would keep seeing rows that have since ended until the
 * next tab switch or pull to refresh, while the calendar (which re-runs its
 * guard on every render) drops them immediately. The interval keeps the
 * list's window guard fresh at the same cadence across web and native.
 */
const AGENDA_REFETCH_INTERVAL_MS = 60_000;

/**
 * Shared option block for every agenda feed hook: the stable window
 * selector plus the periodic refetch that re-runs it (see
 * `AGENDA_REFETCH_INTERVAL_MS`). Callers can spread `{ ...extra }` for
 * hook-specific options (path params, page size, query params).
 */
const agendaOptions = (window: EventsAgendaWindow) => ({
  refetchInterval: AGENDA_REFETCH_INTERVAL_MS,
  select: AGENDA_SELECTS[window],
});

const eventFeeds = (
  client: OpenpeepsClient,
): {
  useUpcomingEventsFeed: (pageSize?: number) => EventFeedHook;
  useCurrentEventsFeed: (pageSize?: number) => EventFeedHook;
  usePastEventsFeed: (pageSize?: number) => EventFeedHook;
  useMyUpcomingEventsFeed: (pageSize?: number) => EventFeedHook;
  useMyCurrentEventsFeed: (pageSize?: number) => EventFeedHook;
  useMyPastEventsFeed: (pageSize?: number) => EventFeedHook;
  useGroupUpcomingEventsFeed: (
    groupId: string,
    pageSize?: number,
  ) => EventFeedHook;
  useGroupPastEventsFeed: (groupId: string, pageSize?: number) => EventFeedHook;
  useEventsCalendarRange: CalendarRangeHook<undefined>;
  useEventsCalendarMyRange: CalendarRangeHook<undefined>;
  useEventsCalendarGroupRange: (
    groupId: string,
    params: { from: string; to: string },
    enabled?: boolean,
  ) => ReturnType<
    typeof apiHook<PublicPost[], { groupId: string }, EventRangeQueryParams>
  >;
} => ({
  useUpcomingEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.upcoming, {
      pageSize,
      queryParams: { limit: pageSize },
      ...agendaOptions('upcoming'),
    }),
  useCurrentEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.current, {
      pageSize,
      queryParams: { limit: pageSize },
      ...agendaOptions('current'),
    }),
  usePastEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.past, {
      pageSize,
      queryParams: { limit: pageSize },
      ...agendaOptions('past'),
    }),
  useMyUpcomingEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.my.upcoming, {
      pageSize,
      queryParams: { limit: pageSize },
      ...agendaOptions('upcoming'),
    }),
  useMyCurrentEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.my.current, {
      pageSize,
      queryParams: { limit: pageSize },
      ...agendaOptions('current'),
    }),
  useMyPastEventsFeed: (pageSize: number | undefined = 15) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.my.past, {
      pageSize,
      queryParams: { limit: pageSize },
      ...agendaOptions('past'),
    }),
  useGroupUpcomingEventsFeed: (groupId: string, pageSize?: number) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.group.upcoming, {
      pathParams: { groupId },
      pageSize: pageSize ?? DEFAULT_FEED_LIMIT,
      ...agendaOptions('upcoming'),
    }),
  useGroupPastEventsFeed: (groupId: string, pageSize?: number) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.events.group.past, {
      pathParams: { groupId },
      pageSize: pageSize ?? DEFAULT_FEED_LIMIT,
      ...agendaOptions('past'),
    }),
  /** Calendar range query — one-shot, not paging. */
  useEventsCalendarRange: (
    params: { from: string; to: string },
    enabled = true,
  ) =>
    apiHook<PublicPost[], undefined, EventRangeQueryParams>(
      client.posts.feeds.events.range,
      {
        queryParams: {
          from: params.from,
          to: params.to,
          limit: CALENDAR_RANGE_LIMIT,
        },
        enabled,
      },
    ),
  /** Calendar my-range query — one-shot, not paging. */
  useEventsCalendarMyRange: (
    params: { from: string; to: string },
    enabled = true,
  ) =>
    apiHook<PublicPost[], undefined, EventRangeQueryParams>(
      client.posts.feeds.events.my.range,
      {
        queryParams: {
          from: params.from,
          to: params.to,
          limit: CALENDAR_RANGE_LIMIT,
        },
        enabled,
      },
    ),
  /** Calendar group-range query — one-shot, not paging. */
  useEventsCalendarGroupRange: (
    groupId: string,
    params: { from: string; to: string },
    enabled = true,
  ) =>
    apiHook<PublicPost[], { groupId: string }, EventRangeQueryParams>(
      client.posts.feeds.events.group.range,
      {
        pathParams: { groupId },
        queryParams: {
          from: params.from,
          to: params.to,
          limit: CALENDAR_RANGE_LIMIT,
        },
        enabled,
      },
    ),
});

type EventFeeds = ReturnType<typeof eventFeeds>;

/**
 * Default page size for any feed-style query. Callers can override by passing
 * an explicit `limit`. Keep in sync with `defaultFeedLimit` in
 * `@openpeepshq/svelte`.
 */
const DEFAULT_FEED_LIMIT = 15;

const jamFeeds = (
  client: OpenpeepsClient,
): {
  useUpcomingJamsFeed: (pageSize?: number) => EventFeedHook;
  usePastJamsFeed: (pageSize?: number) => EventFeedHook;
  useMyUpcomingJamsFeed: (pageSize?: number) => EventFeedHook;
  useMyPastJamsFeed: (pageSize?: number) => EventFeedHook;
} => ({
  useUpcomingJamsFeed: (pageSize: number | undefined = DEFAULT_FEED_LIMIT) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.jams.upcoming, {
      pageSize,
      ...agendaOptions('upcoming'),
    }),
  usePastJamsFeed: (pageSize: number | undefined = DEFAULT_FEED_LIMIT) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.jams.past, {
      pageSize,
      ...agendaOptions('past'),
    }),
  useMyUpcomingJamsFeed: (pageSize: number | undefined = DEFAULT_FEED_LIMIT) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.jams.my.upcoming, {
      pageSize,
      ...agendaOptions('upcoming'),
    }),
  useMyPastJamsFeed: (pageSize: number | undefined = DEFAULT_FEED_LIMIT) =>
    infiniteOffsetQueryApiHook(client.posts.feeds.jams.my.past, {
      pageSize,
      ...agendaOptions('past'),
    }),
});

type JamFeeds = ReturnType<typeof jamFeeds>;

const withFeedLimit = (
  props?: ChronologicalInfiniteQueryParams,
): ChronologicalInfiniteQueryParams => ({
  ...props,
  limit: props?.limit ?? DEFAULT_FEED_LIMIT,
});

const postFeeds = (client: OpenpeepsClient) => ({
  useLocalFeed: (props?: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.posts.feeds.local, {
      queryParams: withFeedLimit(props),
    }),
  useMyFeed: (props?: ChronologicalInfiniteQueryParams) =>
    infiniteChronologicalQueryApiHook(client.posts.feeds.my, {
      queryParams: withFeedLimit(props),
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

type PostQueryHook<T> = ReturnType<
  typeof apiHook<T, { id: string }, undefined>
>;

type PostFinders = {
  usePosts: (props?: ChronologicalInfiniteQueryParams) => PostsInfiniteHook;
  usePostsByType: (
    type: PostType,
    props?: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  usePostsByHashtag: (
    hashtag: string,
    props?: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  usePostsByGroup: (
    id: string,
    props?: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  usePostsByProfile: (
    id: string,
    props?: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  useBookmarkedPosts: (
    props?: ChronologicalInfiniteQueryParams,
  ) => PostsInfiniteHook;
  usePost: (id: string) => PostQueryHook<PublicPost>;
  usePostContext: (id: string) => PostQueryHook<PostContext>;
  usePostReposts: (id: string) => PostQueryHook<PublicPost[]>;
  usePostRecordings: (
    id: string,
    enabled?: boolean,
  ) => PostQueryHook<JamRecording[]>;
  useUnseenPostCounts: () => ReturnType<typeof apiHook<UnseenPostCounts>>;
};

// Explicit return type annotation keeps `tsc` from trying to serialize the
// deeply-inferred shape into `.d.ts` (TS7056 otherwise).
const postFinders = (client: OpenpeepsClient): PostFinders => ({
  usePosts: (props) =>
    infiniteChronologicalQueryApiHook(client.posts.list, {
      queryParams: withFeedLimit(props),
    }) as PostsInfiniteHook,
  usePostsByType: (type, props) =>
    infiniteChronologicalQueryApiHook(client.posts.listByType, {
      pathParams: { type },
      queryParams: withFeedLimit(props),
    }) as PostsInfiniteHook,
  usePostsByHashtag: (hashtag, props) =>
    infiniteChronologicalQueryApiHook(client.posts.listByHashtag, {
      pathParams: { hashtag },
      queryParams: withFeedLimit(props),
    }) as PostsInfiniteHook,
  usePostsByGroup: (id, props) =>
    infiniteChronologicalQueryApiHook(client.posts.listByGroup, {
      pathParams: { id },
      queryParams: withFeedLimit(props),
    }) as PostsInfiniteHook,
  usePostsByProfile: (id, props) =>
    infiniteChronologicalQueryApiHook(client.posts.listByProfile, {
      pathParams: { id },
      queryParams: withFeedLimit(props),
      enabled: !!id,
    }) as PostsInfiniteHook,
  useBookmarkedPosts: (props) =>
    infiniteChronologicalQueryApiHook(client.posts.listBookmarks, {
      queryParams: withFeedLimit(props),
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
  usePostRecordings: (id, enabled = true) =>
    apiHook(client.posts.recordings, {
      pathParams: { id },
      enabled: enabled && !!id,
    }) as PostQueryHook<JamRecording[]>,
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
  markPostsSeenAction: payloadPostsReadMutation(client.posts.seen),
  markGroupPostsSeenAction: noPayloadPostsReadMutation(
    client.posts.seenByGroup,
  ),
  repostPostAction: payloadMutation(client.posts.repost, [['posts']]),
  voteOnPostAction: payloadMutation(client.posts.vote, [['posts']]),
  rsvpToEventAction: payloadMutation(client.posts.rsvp, [['posts'], ['rsvp']]),
  rsvpManageAction: payloadMutation(client.posts.rsvpManage, [
    ['posts'],
    ['rsvp'],
  ]),
  publishRecordingReplyAction: noPayloadMutation(
    client.posts.publishRecordingReply,
    [['posts']],
  ),
  deleteRecordingAction: noPayloadMutation(client.posts.deleteRecording, [
    ['posts'],
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
