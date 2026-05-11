import { ensureLocalProfile } from '#lib/auth';
import { publicPostSchema, offsetInfiniteQueryParamsSchema, searchResultSchema } from "@openpeeps/common";
import { searchEvents } from "@openpeeps/core/search";
import { endpoint, z } from '#lib/endpoint';

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string(),
});

export const Output = searchResultSchema(publicPostSchema);


export const apiEndpoint = endpoint({ Output, Query }).handle(async (query, event) => {

    const profile = await ensureLocalProfile(event);

    return searchEvents(query.q, profile, offsetInfiniteQueryParamsSchema.parse(query));
})