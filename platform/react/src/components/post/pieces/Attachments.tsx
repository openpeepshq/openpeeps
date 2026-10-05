import { useState } from 'react';
import type {
  MediaAttachmentData,
  PublicPost,
} from '@openpeepshq/common/types';
import { useStaticRender } from '../../markdown/staticRender';
import { VideoPlayOverlay } from '../VideoPlayOverlay';
import { AudioAttachment, isAudioAttachment } from './AudioAttachment';
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
  const { enabled: staticRender } = useStaticRender();
  const attachments = attachmentsOf(post);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);

  if (attachments.length === 0) return null;

  const indexed = attachments.map((att, idx) => ({ att, idx }));
  const visual = indexed.filter(({ att }) => !isAudioAttachment(att));
  const audio = indexed.filter(({ att }) => isAudioAttachment(att));

  const single = visual.length === 1;
  const cols = single
    ? ''
    : visual.length === 2
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
      <div className="mt-2 flex w-full flex-col gap-2">
        {visual.length > 0 ? (
          <div
            className={`w-full gap-1 overflow-hidden rounded-md ${cols} ${height}`}
          >
            {visual.map(({ att, idx }) => {
              const tile = (
                <>
                  {isImage(att) && (att.previewUrl || att.url) ? (
                    <img
                      src={att.previewUrl ?? att.url ?? ''}
                      alt={att.description ?? `attachment ${idx + 1}`}
                      className={mediaClass}
                    />
                  ) : isVideo(att) && (att.previewUrl || att.url) ? (
                    <div className="relative h-full w-full">
                      <img
                        src={att.previewUrl ?? att.url ?? ''}
                        alt={att.description ?? `attachment ${idx + 1}`}
                        className={mediaClass}
                      />
                      <VideoPlayOverlay video />
                    </div>
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

        {audio.map(({ att, idx }) => (
          <AudioAttachment
            key={`${att.url ?? idx}-${idx}`}
            src={att.url}
            label={att.filename ?? att.description}
            size={att.meta?.size}
          />
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
