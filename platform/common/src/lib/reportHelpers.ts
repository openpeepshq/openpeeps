import type { ReportedMedia, Role } from '../types';
import { checkRoleCapabilities } from './capabilitiesHelpers';

/** True when the reporter is the reported profile or authored a reported post. */
export const isSelfReport = (
  reporterId: string,
  reportedProfileId: string,
  postAuthorIds: readonly string[],
): boolean =>
  reporterId === reportedProfileId || postAuthorIds.includes(reporterId);

/** Viewer may file a report against another member's content. */
export const canReportAuthor = (
  reporterId: string | undefined,
  roles: Role[] | undefined,
  authorId: string | undefined,
): boolean =>
  !!reporterId &&
  !!authorId &&
  reporterId !== authorId &&
  checkRoleCapabilities(roles ?? [], ['core-reports-create']).success;

type AttachmentSnapshot = {
  url?: string;
  previewUrl?: string | null;
  filename?: string;
  type?: string;
};

/** Fields stored on a report for one attachment. Skips files with no URL. */
export const reportedMediaFromAttachment = (
  attachment: AttachmentSnapshot,
): ReportedMedia | undefined => {
  if (!attachment.url) return undefined;
  return {
    url: attachment.url,
    previewUrl: attachment.previewUrl,
    filename: attachment.filename,
    type: attachment.type,
  };
};

type PostWithAttachments = {
  data?: { attachments?: readonly AttachmentSnapshot[] } | null;
};

/**
 * Canonical attachment snapshots for the requested URLs.
 * Returns undefined when any URL is not an attachment on `posts`.
 */
export const reportedMediaOnPosts = (
  media: readonly { url: string }[],
  posts: readonly PostWithAttachments[],
): ReportedMedia[] | undefined => {
  const byUrl = new Map<string, ReportedMedia>();
  for (const post of posts) {
    for (const attachment of post.data?.attachments ?? []) {
      const snapshot = reportedMediaFromAttachment(attachment);
      if (snapshot) byUrl.set(snapshot.url, snapshot);
    }
  }
  if (media.some((item) => !byUrl.has(item.url))) return undefined;
  return media.flatMap((item) => {
    const snapshot = byUrl.get(item.url);
    return snapshot ? [snapshot] : [];
  });
};
