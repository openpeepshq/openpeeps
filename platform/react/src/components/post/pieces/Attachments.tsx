import { useState } from 'react';
import type {
  MediaAttachmentData,
  PublicPost,
} from '@openpeepshq/common/types';
import { useStaticRender } from '../../markdown/staticRender';
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
const isAudio = (att: MediaAttachmentData) =>
  att.type === 'audio' || att.meta?.mimetype?.startsWith('audio/');

export function Attachments({ post }: AttachmentsProps) {
  const { enabled: staticRender } = useStaticRender();
  const attachments = attachmentsOf(post);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  if (attachments.length === 0) return null;

  // Audio and video play inline through native players instead of the tile
  // grid; uploads are transcoded to mp4, so <video> plays without HLS.
  const media = attachments.filter((att) => !isAudio(att) && !isVideo(att));
  const inlineFiles = attachments.filter((att) => isAudio(att) || isVideo(att));

  const single = media.length === 1;
  const cols = single
    ? ''
    : media.length === 2
      ? 'grid grid-cols-2'
      : 'grid grid-cols-2 grid-rows-2';
  // With a single attachment the grid has no fixed height, so the children
  // must size to their content. Forcing `h-full` there collapses the media to
  // zero height and the preview renders blank. Only constrain the height when
  // there are multiple tiles sharing the grid.
  const height = single ? '' : 'h-96 md:h-[486px]';
  const tileClass = single ? 'w-full' : 'h-full w-full';
  const mediaClass = single
    ? 'max-h-[600px] w-full object-contain'
    : 'h-full w-full object-cover';

  return (
    <>
      {media.length > 0 ? (
        <div
          className={`mt-2 w-full gap-1 overflow-hidden rounded-md ${cols} ${height}`}
        >
          {media.map((att, idx) => {
            const tile = (
              <>
                {isImage(att) && (att.previewUrl || att.url) ? (
                  <img
                    src={att.previewUrl ?? att.url ?? ''}
                    alt={att.description ?? `attachment ${idx + 1}`}
                    className={mediaClass}
                  />
                ) : (
                  <div className="text-muted-foreground flex min-h-24 w-full flex-col items-center justify-center gap-1 p-4 text-center text-xs">
                    <span className="text-foreground break-all font-medium">
                      {att.filename ??
                        att.description ??
                        `Attachment ${idx + 1}`}
                    </span>
                    {att.meta?.mimetype ? (
                      <span className="uppercase">{att.meta.mimetype}</span>
                    ) : null}
                  </div>
                )}
              </>
            );

            if (staticRender) {
              return (
                <div
                  key={`${att.url ?? idx}-${idx}`}
                  className={`${tileClass} bg-surface overflow-hidden`}
                >
                  {tile}
                </div>
              );
            }

            return (
              <button
                key={`${att.url ?? idx}-${idx}`}
                type="button"
                className={`${tileClass} bg-surface overflow-hidden`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setGalleryIndex(idx);
                }}
              >
                {tile}
              </button>
            );
          })}
        </div>
      ) : null}

      {inlineFiles.length > 0 ? (
        <div className="mt-2 flex w-full flex-col gap-2">
          {inlineFiles.map((att, idx) => (
            <div
              key={`${att.url ?? idx}-${idx}`}
              className="bg-surface rounded-md p-2"
            >
              {att.filename || att.description ? (
                <span className="text-muted-foreground block truncate px-1 pb-1 text-xs font-medium">
                  {att.filename ?? att.description}
                </span>
              ) : null}
              {isVideo(att) ? (
                <video
                  src={att.url}
                  poster={att.previewUrl ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  className="max-h-[70vh] w-full rounded-sm"
                />
              ) : (
                <audio
                  src={att.url}
                  controls
                  preload="none"
                  className="w-full"
                />
              )}
            </div>
          ))}
        </div>
      ) : null}

      {galleryIndex !== null ? (
        <GalleryModal
          attachments={media}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
        />
      ) : null}
    </>
  );
}
