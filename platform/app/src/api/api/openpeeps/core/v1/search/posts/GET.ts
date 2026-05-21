import { ensureLocalProfile } from "$lib/server/auth";
import { publicPostSchema, offsetInfiniteQueryParamsSchema, searchResultSchema } from "@openpeeps/common";
import { searchPosts } from "@openpeeps/core/search";
import { Endpoint, z } from "sveltekit-api";

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string(),
});

export const Output = searchResultSchema(publicPostSchema);

export default new Endpoint({ Output, Query }).handle(
    async (query, event) => {
        await ensureLocalProfile(event);
        return searchPosts(query.q, event.locals.authData, offsetInfiniteQueryParamsSchema.parse(query));
    })