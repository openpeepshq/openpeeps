import { ensureLocalProfile } from "$lib/server/auth";
import { offsetInfiniteQueryParamsSchema, searchResultCountsSchema } from "@openpeeps/common";
import { searchResultCounts } from "@openpeeps/core/search";
import { Endpoint, z } from "sveltekit-api";

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string().min(3),
});

export const Output = searchResultCountsSchema;


export default new Endpoint({ Output, Query }).handle(async (query, event) => {

    await ensureLocalProfile(event);

    return searchResultCounts(query.q, event.locals.authData);
})