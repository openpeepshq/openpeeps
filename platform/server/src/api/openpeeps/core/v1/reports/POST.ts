import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import {
  reportDataSchema,
  publicReportSchema,
  isSelfReport,
  reportedMediaOnPosts,
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

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Input, Output, Error }).handle(
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
    const postAuthorIds = posts.map(
      (post) => post.profile?.id ?? post.creatorId,
    );
    if (isSelfReport(profile.id, reportedProfile.id, postAuthorIds)) {
      throw forbidden();
    }
    const requestedMedia = input.report.media;
    let report = input.report;
    if (requestedMedia?.length) {
      // Persist the attachment stored on the post, not the client snapshot.
      const media = reportedMediaOnPosts(requestedMedia, posts);
      if (!media) throw notFound();
      report = { ...input.report, media };
    }
    return createReport(report, profile, reportedProfile, posts);
  },
);
