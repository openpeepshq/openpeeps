import { ensureLocalProfile } from '#lib/auth';
import { publicPostSchema, offsetInfiniteQueryParamsSchema, searchResultSchema } from "@openpeepshq/common";
import { searchPosts } from "@openpeepshq/core/search";
import { endpoint, z } from '#lib/endpoint';

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string(),
});

export const Output = searchResultSchema(publicPostSchema);

export const apiEndpoint = endpoint({ Output, Query }).handle(
    async (query, event) => {
        await ensureLocalProfile(event);

        return searchPosts(query.q, event.context.authData, offsetInfiniteQueryParamsSchema.parse(query));
    })