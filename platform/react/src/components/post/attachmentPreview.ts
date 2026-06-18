import type { MediaAttachmentData } from '@openpeeps/common';

export const isBlobUrl = (url?: string | null): boolean =>
  !!url?.startsWith('blob:');

export const revokeBlobUrl = (url?: string) => {
  if (isBlobUrl(url)) URL.revokeObjectURL(url!);
};

/** Prefer a persisted server URL over a local blob preview once available. */
export const resolveAttachmentPreviewUrl = (
  localPreviewUrl: string | undefined,
  attachment?: MediaAttachmentData,
): string => {
  const candidates = [
    attachment?.previewUrl,
    attachment?.url,
    localPreviewUrl,
  ].filter((url): url is string => !!url);

  return (
    candidates.find((url) => !isBlobUrl(url)) ?? candidates[0] ?? ''
  );
};
