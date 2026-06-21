import type { MediaAttachmentData } from '@openpeeps/common';

/** True when an attachment should render as an image (not a document download). */
export const isImageAttachment = (att: MediaAttachmentData): boolean => {
  const mime = att.meta?.mimetype?.toLowerCase() ?? '';
  if (att.type === 'image' || mime.startsWith('image/')) return true;
  if (att.previewUrl && att.type === 'document') return true;
  const fname = att.filename ?? '';
  if (
    att.type === 'document' &&
    /\.(jpe?g|png|gif|webp|heic|heif)$/i.test(fname)
  ) {
    return true;
  }
  return false;
};
