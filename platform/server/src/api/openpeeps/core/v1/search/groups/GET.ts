import { ensureLocalProfile } from '#lib/auth';
import { groupWithMetaSchema, offsetInfiniteQueryParamsSchema, searchResultSchema } from "@openpeeps/common";
import { searchGroups } from "@openpeeps/core/search";
import { endpoint, z } from '#lib/endpoint';

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string(),
});

export const Output = searchResultSchema(groupWithMetaSchema);

export const apiEndpoint = endpoint({ Output, Query }).handle(
    async (query, event) => {

        const profile = await ensureLocalProfile(event);

        return searchGroups(query.q, profile, offsetInfiniteQueryParamsSchema.parse(query));
    })