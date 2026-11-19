import {
  dateSorter,
  MediaAttachmentData,
  PostCreationData,
  PublicPost,
  Thread,
} from '@openpeepshq/common';

/** True if the attachment is still being processed server-side. */
export const isAttachmentProcessing = (
  attachment: MediaAttachmentData
): boolean => attachment.status === 'processing';

/** True if at least one of `postData.data.attachments` is still processing. */
export const hasProcessingAttachments = (
  postData: PostCreationData | undefined
): boolean => (postData?.data?.attachments ?? []).some(isAttachmentProcessing);

export const lastLongestPathSelector = (
  thread: Thread
): Thread & { depth: number } => {
  const candidates = thread.children.map((t) => lastLongestPathSelector(t));

  const maxDepth = Math.max(0, ...candidates.map((c) => c.depth));

  const selectedChild = candidates
    .filter((c) => c.depth === maxDepth)
    .sort(dateSorter())
    .reverse()[0];

  return {
    ...thread,
    children: selectedChild ? [selectedChild] : [],
    depth: maxDepth + 1,
  };
};

export const collectPath = (
  thread: Thread,
  currentPath: PublicPost[] = []
): PublicPost[] => {
  if (thread) {
    return [...currentPath, thread, ...collectPath(thread.children[0])];
  } else {
    return currentPath;
  }
};
