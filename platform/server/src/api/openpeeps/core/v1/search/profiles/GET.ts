import { ensureLocalProfile } from '#lib/auth';
import { offsetInfiniteQueryParamsSchema, publicProfileSchema, searchResultSchema } from "@openpeeps/common";
import { searchProfiles } from "@openpeeps/core/search";
import { endpoint, z } from '#lib/endpoint';
import { notFound } from '#lib/errors';

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string(),
});

export const Output = searchResultSchema(publicProfileSchema);

export const Error = {
    404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Query }).handle(
    async (query, event) => {

        const profile = await ensureLocalProfile(event);

        return searchProfiles(query.q, profile, offsetInfiniteQueryParamsSchema.parse(query));
    })