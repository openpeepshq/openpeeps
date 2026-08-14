import { useEffect, useState, type MouseEvent } from 'react';
import { createPortal } from 'react-dom';
import type { MediaAttachmentData } from '@openpeepshq/common/types';
import { useT } from '../../../i18n';
import { VideoPlayer } from './VideoPlayer';

export interface GalleryModalProps {
  attachments: MediaAttachmentData[];
  initialIndex?: number;
  onClose: () => void;
}

const stop = (e: MouseEvent) => {
  e.preventDefault();
  e.stopPropagation();
};

export function GalleryModal({
  attachments,
  initialIndex = 0,
  onClose,
}: GalleryModalProps) {
  const t = useT();
  const [index, setIndex] = useState(initialIndex);
  const attachment = attachments[index];

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  if (!attachment) return null;

  const prev = (e: MouseEvent) => {
    stop(e);
    setIndex((i) => (i === 0 ? attachments.length - 1 : i - 1));
  };
  const next = (e: MouseEvent) => {
    stop(e);
    setIndex((i) => (i === attachments.length - 1 ? 0 : i + 1));
  };

  const modal = (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      role="dialog"
      aria-modal
      onClick={(e) => {
        stop(e);
        onClose();
      }}
    >
      {attachments.length > 1 ? (
        <button
          type="button"
          title={t('posts.gallery.previous', { defaultValue: 'Previous' })}
          className="rounded-button absolute left-2 top-1/2 z-50 -translate-y-1/2 bg-white/15 p-4 text-xl font-bold shadow-xl md:left-4"
          onClick={prev}
        >
          ←
        </button>
      ) : null}

      <div
        className="max-h-[90vh] max-w-[90vw] overflow-auto p-4"
        onClick={(e) => e.stopPropagation()}
      >
        {attachment.type === 'video' ||
        attachment.meta?.mimetype?.startsWith('video/') ? (
          <VideoPlayer
            key={attachment.url}
            attachment={attachment}
            className="max-h-[85vh] max-w-full"
          />
        ) : attachment.type === 'audio' ||
          attachment.meta?.mimetype?.startsWith('audio/') ? (
          <audio
            src={attachment.url}
            controls
            className="w-full min-w-[280px]"
          />
        ) : attachment.type === 'image' ||
          attachment.meta?.mimetype?.startsWith('image/') ? (
          <img
            src={attachment.url ?? attachment.previewUrl ?? ''}
            alt={attachment.description ?? ''}
            className="max-h-[85vh] max-w-full object-contain"
          />
        ) : (
          <div className="bg-surface space-y-3 rounded-md p-6 text-center">
            <p className="font-medium">
              {attachment.filename ?? attachment.description ?? 'Document'}
            </p>
            {attachment.url ? (
              <a
                href={attachment.url}
                target="_blank"
                rel="noreferrer"
                className="text-primary underline"
              >
                {t('posts.gallery.openDocument', {
                  defaultValue: 'Open file',
                })}
              </a>
            ) : null}
          </div>
        )}
      </div>

      {attachments.length > 1 ? (
        <button
          type="button"
          title={t('posts.gallery.next', { defaultValue: 'Next' })}
          className="rounded-button absolute right-2 top-1/2 z-50 -translate-y-1/2 bg-white/15 p-4 text-xl font-bold shadow-xl md:right-4"
          onClick={next}
        >
          →
        </button>
      ) : null}

      <button
        type="button"
        title={t('posts.gallery.close', { defaultValue: 'Close' })}
        className="rounded-button bg-primary text-primary-foreground fixed right-4 top-4 z-50 px-3 py-2 text-lg font-bold shadow-xl"
        onClick={(e) => {
          stop(e);
          onClose();
        }}
      >
        ×
      </button>
    </div>
  );

  return typeof document === 'undefined'
    ? modal
    : createPortal(modal, document.body);
}
