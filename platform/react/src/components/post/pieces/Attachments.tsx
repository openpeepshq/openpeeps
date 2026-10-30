import { useState } from 'react';
import {
  canReportAuthor,
  reportedMediaFromAttachment,
} from '@openpeepshq/common/lib';
import type {
  MediaAttachmentData,
  PublicPost,
  ReportedMedia,
} from '@openpeepshq/common/types';
import { useT } from '../../../i18n';
import { useCurrentProfile } from '../../layout/IdentityContext';
import { ReportProfileOrPostModal } from '../../profile/ReportProfileOrPostModal';
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
  const t = useT();
  const me = useCurrentProfile();
  const { enabled: staticRender } = useStaticRender();
  const attachments = attachmentsOf(post);
  const [galleryIndex, setGalleryIndex] = useState<number | null>(null);
  const [reporting, setReporting] = useState<ReportedMedia | null>(null);
  const canReport =
    !staticRender && canReportAuthor(me?.id, me?.roles, post.profile?.id);

  const reportAttachment = (attachment: MediaAttachmentData) => {
    const media = reportedMediaFromAttachment(attachment);
    if (!media) return;
    setGalleryIndex(null);
    setReporting(media);
  };

  if (attachments.length === 0) return null;

  // A lone audio or video file plays inline. Anything else stays a gallery
  // tile, including an audio or video file that shares the post with others.
  const sole = attachments.length === 1 ? attachments[0] : undefined;
  const inline =
    sole && (isAudioAttachment(sole) || isVideo(sole)) ? sole : undefined;

  const reportControl = (attachment: MediaAttachmentData) =>
    canReport && reportedMediaFromAttachment(attachment) ? (
      <button
        type="button"
        className="text-destructive mt-1 self-end text-xs font-medium"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          reportAttachment(attachment);
        }}
      >
        {t('common.actions.reportMedia', { defaultValue: 'Report file' })}
      </button>
    ) : null;

  const reportModal = reporting ? (
    <ReportProfileOrPostModal
      reportType="media"
      post={post}
      media={reporting}
      open
      onClose={() => setReporting(null)}
    />
  ) : null;

  if (inline && isVideo(inline)) {
    return (
      <>
        <div className="bg-surface mt-2 flex w-full flex-col overflow-hidden rounded-md">
          <video
            src={inline.url}
            poster={inline.previewUrl ?? undefined}
            controls
            playsInline
            preload="metadata"
            className="max-h-[70vh] w-full"
          />
          {reportControl(inline)}
        </div>
        {reportModal}
      </>
    );
  }

  if (inline) {
    return (
      <>
        <div className="mt-2 flex flex-col">
          <AudioAttachment
            src={inline.url}
            label={inline.filename ?? inline.description}
            size={inline.meta?.size}
          />
          {reportControl(inline)}
        </div>
        {reportModal}
      </>
    );
  }

  const indexed = attachments.map((att, idx) => ({ att, idx }));
  const single = indexed.length === 1;
  const cols = single
    ? ''
    : indexed.length === 2
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
      <div
        className={`mt-2 w-full gap-1 overflow-hidden rounded-md ${cols} ${height}`}
      >
        {indexed.map(({ att, idx }) => {
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
                    {att.filename ?? att.description ?? `Attachment ${idx + 1}`}
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

      {galleryIndex !== null ? (
        <GalleryModal
          attachments={attachments}
          initialIndex={galleryIndex}
          onClose={() => setGalleryIndex(null)}
          onReport={canReport ? reportAttachment : undefined}
        />
      ) : null}

      {reportModal}
    </>
  );
}
