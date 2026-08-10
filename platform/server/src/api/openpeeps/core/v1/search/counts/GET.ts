import { ensureLocalProfile } from '#lib/auth';
import { offsetInfiniteQueryParamsSchema, searchResultCountsSchema } from "@openpeepshq/common";
import { searchResultCounts } from "@openpeepshq/core/search";
import { endpoint, z } from '#lib/endpoint';

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string().min(3),
});

export const Output = searchResultCountsSchema;


export const apiEndpoint = endpoint({ Output, Query }).handle(async (query, event) => {

    const profile = await ensureLocalProfile(event);

    return searchResultCounts(query.q, event.context.authData);
})