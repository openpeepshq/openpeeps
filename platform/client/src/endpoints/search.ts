import { FetchClient } from "@openpeeps/fetch-client";
import { allpeepNoPayloadEndpoint } from "./helpers";
import { GroupWithMeta, PublicPost, OffsetInfiniteQueryParams, PublicProfile, SearchResult, SearchResultCounts } from "@openpeeps/common";

type SearchQueryParams = OffsetInfiniteQueryParams & {
    q: string;
}

export const search = (rawClient: FetchClient) => ({
    posts: allpeepNoPayloadEndpoint<SearchResult<PublicPost>, undefined, SearchQueryParams>(
        rawClient,
        '/search/posts',
    ),
    profiles: allpeepNoPayloadEndpoint<SearchResult<PublicProfile>, undefined, SearchQueryParams>(
        rawClient,
        '/search/profiles',
    ),
    events: allpeepNoPayloadEndpoint<SearchResult<PublicPost>, undefined, SearchQueryParams>(
        rawClient,
        '/search/events',
    ),
    jams: allpeepNoPayloadEndpoint<SearchResult<PublicPost>, undefined, SearchQueryParams>(
        rawClient,
        '/search/jams',
    ),
    groups: allpeepNoPayloadEndpoint<SearchResult<GroupWithMeta>, undefined, SearchQueryParams>(
        rawClient,
        '/search/groups',
    ),
    counts: allpeepNoPayloadEndpoint<SearchResultCounts, undefined, SearchQueryParams>(
        rawClient,
        '/search/counts',
    ),
})
