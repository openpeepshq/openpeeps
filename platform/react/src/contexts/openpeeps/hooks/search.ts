import type { OpenpeepsClient } from '@openpeeps/client';
import { infiniteOffsetQueryApiHook, apiHook } from '../helpers';

export type SearchHooks = ReturnType<typeof searchHooks>;

export const searchHooks = (client: OpenpeepsClient) => ({
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
