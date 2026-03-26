import { ensureLocalProfile } from "$lib/server/auth";
import { offsetInfiniteQueryParamsSchema, publicProfileSchema, searchResultSchema } from "@openpeeps/common";
import { searchProfiles } from "@openpeeps/core/search";
import { Endpoint, z } from "sveltekit-api";
import { notFound } from '$lib/server/api/errors';

export const Query = offsetInfiniteQueryParamsSchema.extend({
    q: z.string(),
});

export const Output = searchResultSchema(publicProfileSchema);

export const Error = {
    404: notFound(),
};

export default new Endpoint({ Output, Query }).handle(
    async (query, event) => {

        const profile = await ensureLocalProfile(event);

        return searchProfiles(query.q, profile, offsetInfiniteQueryParamsSchema.parse(query));
    })