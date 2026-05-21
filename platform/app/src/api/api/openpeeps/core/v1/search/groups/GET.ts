import { ensureLocalProfile } from "$lib/server/auth";
import { groupWithMetaSchema, offsetInfiniteQueryParamsSchema, searchResultSchema } from "@openpeeps/common";
import { searchGroups } from "@openpeeps/core/search";
import { Endpoint, z } from "sveltekit-api";

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string(),
});

export const Output = searchResultSchema(groupWithMetaSchema);

export default new Endpoint({ Output, Query }).handle(
    async (query, event) => {

        await ensureLocalProfile(event);

        return searchGroups(query.q, event.locals.authData, offsetInfiniteQueryParamsSchema.parse(query));
    })