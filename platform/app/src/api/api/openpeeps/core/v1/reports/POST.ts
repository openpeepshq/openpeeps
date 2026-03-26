import { notFound } from "$lib/server/api/errors";
import { ensureRoleCapabilities } from "$lib/server/auth";
import { reportDataSchema, reportWithMetaSchema, type PostWithMeta } from "@openpeeps/common";
import { findPost } from "@openpeeps/core/posts";
import { findProfile } from "@openpeeps/core/profiles";
import { createReport } from "@openpeeps/core/reports";
import { Endpoint, z } from "sveltekit-api";

export const Input = z.object({
    report: reportDataSchema,
    profileId: z.string(),
    postIds: z.string().array()
});

export const Output = reportWithMetaSchema;

export default new Endpoint({ Input }).handle(async (input, event) => {
    const profile = await ensureRoleCapabilities(event, ['core-reports-create']);
    const reportedProfile = await findProfile(input.profileId);
    if (!reportedProfile) {
        throw notFound();
    }
    const posts = await Promise.all(input.postIds.map(postId => findPost(postId)).filter(Boolean)) as PostWithMeta[];
    return createReport(input.report, profile, reportedProfile, posts);
});