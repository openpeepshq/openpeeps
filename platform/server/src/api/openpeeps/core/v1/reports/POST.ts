import { notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import {
  reportDataSchema,
  publicReportSchema,
  type PostWithMeta,
} from '@openpeepshq/common';
import { findPost } from '@openpeepshq/core/posts';
import { findProfile } from '@openpeepshq/core/profiles';
import { createReport } from '@openpeepshq/core/reports';
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