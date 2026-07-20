import { notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import {
  reportDataSchema,
  publicReportSchema,
  type PostWithMeta,
} from '@openpeeps/common';
import { findPost } from '@openpeeps/core/posts';
import { findProfile } from '@openpeeps/core/profiles';
import { createReport } from '@openpeeps/core/reports';
import { endpoint, z } from '#lib/endpoint';

export const Input = z.object({
  report: reportDataSchema,
  profileId: z.string(),
  postIds: z.string().array(),
});

export const Output = publicReportSchema;

export const apiEndpoint = endpoint({ Input, Output }).handle(
  async (input, event) => {
    const profile = await ensureRoleCapabilities(event, [
      'core-reports-create',
    ]);
    const reportedProfile = await findProfile(input.profileId);
    if (!reportedProfile) {
      throw notFound();
    }
    const posts = (
      await Promise.all(
        (input.postIds as string[]).map((postId: string) => findPost(postId)),
      )
    ).filter(Boolean) as PostWithMeta[];
    return createReport(input.report, profile, reportedProfile, posts);
  },
);