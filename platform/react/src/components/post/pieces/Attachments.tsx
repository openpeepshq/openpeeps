import { useState } from 'react';
import type { MediaAttachmentData, PublicPost } from '@openpeeps/common/types';
import { GalleryModal } from './GalleryModal';

export interface AttachmentsProps {
  post: PublicPost;
}

const attachmentsOf = (post: PublicPost): MediaAttachmentData[] => {
  const data = post.data as { attachments?: MediaAttachmentData[] } | undefined;
  return data?.attachments ?? [];
};

const isImage = (att: MediaAttachmentData) =>
  att.type === 'image' || att.meta?.mimetype?.startsWith('image/');
const isVideo = (att: MediaAttachmentData) =>
  att.type === 'video' || att.meta?.mimetype?.startsWith('video/');

export function Attachments({ post }: AttachmentsProps) {
  const attachments = attachmentsOf(post);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  if (attachments.length === 0) return null;

  const cols =
    attachments.length === 1
      ? ''
      : attachments.length === 2
        ? 'grid grid-cols-2'
        : 'grid grid-cols-2 grid-rows-2';
  const height = attachments.length > 1 ? 'h-96 md:h-[486px]' : '';

  return (
    <>
      <div
        className={`mt-2 w-full gap-1 overflow-hidden rounded-md ${cols} ${height}`}
      >
        {attachments.map((att, idx) => (
          <button
            key={`${att.url ?? idx}-${idx}`}
            type="button"
            className="h-full w-full overflow-hidden bg-surface-100"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setGalleryIndex(idx);
            }}
          >
            {isImage(att) && (att.previewUrl || att.url) ? (
              <img
                src={att.previewUrl ?? att.url ?? ''}
                alt={att.description ?? `attachment ${idx + 1}`}
                className="h-full w-full object-cover"
              />
            ) : isVideo(att) && att.url ? (
              <video
                src={att.url}
                className="pointer-events-none h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                {att.filename ?? att.description ?? `Attachment ${idx + 1}`}
              </div>
            )}
          </button>
        ))}
      </div>

      {galleryIndex !== null ? (
        <GalleryModal
          attachments={attachments}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      ) : null}
    </>
  );
}
