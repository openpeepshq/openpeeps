import { ensureLocalProfile } from '#lib/auth';
import { groupWithMetaSchema, offsetInfiniteQueryParamsSchema, searchResultSchema } from "@openpeepshq/common";
import { searchGroups } from "@openpeepshq/core/search";
import { endpoint, z } from '#lib/endpoint';

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string(),
});

export const Output = searchResultSchema(groupWithMetaSchema);

export const apiEndpoint = endpoint({ Output, Query }).handle(
    async (query, event) => {

        await ensureLocalProfile(event);

        return searchGroups(query.q, event.context.authData, offsetInfiniteQueryParamsSchema.parse(query));
    })