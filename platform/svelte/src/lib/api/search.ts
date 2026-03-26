import type { GroupWithMeta, PublicPost, SearchResult, PublicProfile, SearchResultCounts } from "@openpeeps/common";
import { client, simpleStore, infiniteOffsetStore } from "./helpers";

export const searchPostsStore = (
    props: {
        q: string,
    }
) =>
    infiniteOffsetStore<SearchResult<PublicPost>, undefined, { q: string, limit: number, offset: number }>(client.search.posts, {
        queryParams: props,
        pageSize: 15,
    });

export const searchGroupsStore = (
    props: {
        q: string,
    }
) =>
    infiniteOffsetStore<SearchResult<GroupWithMeta>, undefined, { q: string, limit: number, offset: number }>(client.search.groups, {
        queryParams: props,
        pageSize: 15,
    });

export const searchJamsStore = (
    props: {
        q: string,
    }
) =>
    infiniteOffsetStore<SearchResult<PublicPost>, undefined, { q: string, limit: number, offset: number }>(client.search.jams, {
        queryParams: props,
        pageSize: 15,
    });

export const searchProfilesStore = (
    props: {
        q: string,
    }
) => infiniteOffsetStore<SearchResult<PublicProfile>, undefined, { q: string, limit: number, offset: number }>(client.search.profiles, {
    queryParams: props,
    pageSize: 15,
});

export const searchEventsStore = (
    props: {
        q: string,
    }
) =>
    infiniteOffsetStore<SearchResult<PublicPost>, undefined, { q: string, limit: number, offset: number }>(client.search.events, {
        queryParams: props,
        pageSize: 15,
    });

export const searchCountsStore = (
    props: {
        q: string,
    }
) => simpleStore<SearchResultCounts, undefined, { q: string }>(client.search.counts, {
    queryParams: props,
    preQueryCheck: (options) => {
        if (!options?.queryParams?.q?.length || options.queryParams.q.length < 3) {
            throw { success: false, message: 'Query must be at least 3 characters' };
        }
    },
});