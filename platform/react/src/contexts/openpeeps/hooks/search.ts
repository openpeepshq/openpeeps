import type { OpenpeepsClient } from '@openpeepshq/client';
import type {
  GroupWithMeta,
  PublicPost,
  PublicProfile,
  SearchResult,
  SearchResultCounts,
  SuccessFailureResponse,
} from '@openpeepshq/common';
import type {
  InfiniteData,
  UseInfiniteQueryResult,
  UseQueryResult,
} from '@tanstack/react-query';
import { infiniteOffsetQueryApiHook, apiHook } from '../helpers';

type Query<T> = UseQueryResult<T, SuccessFailureResponse>;
type OffsetSearch<T> = UseInfiniteQueryResult<
  InfiniteData<SearchResult<T>>,
  SuccessFailureResponse
>;

export type SearchHooks = {
  useSearchGroups: (q: string, limit?: number) => OffsetSearch<GroupWithMeta>;
  useSearchPosts: (q: string, limit?: number) => OffsetSearch<PublicPost>;
  useSearchJams: (q: string, limit?: number) => OffsetSearch<PublicPost>;
  useSearchProfiles: (q: string, limit?: number) => OffsetSearch<PublicProfile>;
  useSearchEvents: (q: string, limit?: number) => OffsetSearch<PublicPost>;
  useSearchCounts: (q: string) => Query<SearchResultCounts>;
};

export const searchHooks = (client: OpenpeepsClient): SearchHooks => ({
  useSearchGroups: (q: string, limit = 15) =>
    infiniteOffsetQueryApiHook(client.search.groups, {
      queryParams: { q, limit: limit },
      pageSize: 15,
    }),
  useSearchPosts: (q: string, limit = 15) =>
    infiniteOffsetQueryApiHook(client.search.posts, {
      queryParams: { q, limit: limit },
      pageSize: 15,
    }),
  useSearchJams: (q: string, limit = 15) =>
    infiniteOffsetQueryApiHook(client.search.jams, {
      queryParams: { q, limit: limit },
      pageSize: 15,
    }),
  useSearchProfiles: (q: string, limit = 15) =>
    infiniteOffsetQueryApiHook(client.search.profiles, {
      queryParams: { q, limit: limit },
      pageSize: 15,
    }),
  useSearchEvents: (q: string, limit = 15) =>
    infiniteOffsetQueryApiHook(client.search.events, {
      queryParams: { q, limit: limit },
      pageSize: 15,
    }),
  useSearchCounts: (q: string) =>
    apiHook(client.search.counts, { queryParams: { q } }),
});
