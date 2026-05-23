import { useState } from 'react';
import type { MediaAttachmentData } from '@openpeeps/common/types';
import { useT } from '../../../i18n';

export interface GalleryModalProps {
  attachments: MediaAttachmentData[];
  initialIndex?: number;
  onClose: () => void;
}

export function GalleryModal({
  attachments,
  initialIndex = 0,
  onClose,
}: GalleryModalProps) {
  const t = useT();
  const [index, setIndex] = useState(initialIndex);
  const attachment = attachments[index];

  if (!attachment) return null;

  const prev = () =>
    setIndex((i) => (i === 0 ? attachments.length - 1 : i - 1));
  const next = () =>
    setIndex((i) => (i === attachments.length - 1 ? 0 : i + 1));

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80"
      role="dialog"
      aria-modal
    >
      {attachments.length > 1 ? (
        <button
          type="button"
          title={t('posts.gallery.previous', { defaultValue: 'Previous' })}
          className="absolute left-2 top-1/2 z-50 -translate-y-1/2 rounded-md bg-white/15 p-4 text-xl font-bold shadow-xl md:left-4"
          onClick={prev}
        >
          ←
        </button>
      ) : null}

      <div className="max-h-[90vh] max-w-[90vw] overflow-auto p-4">
        {attachment.type === 'video' || attachment.meta?.mimetype?.startsWith('video/') ? (
          <video
            src={attachment.url ?? attachment.previewUrl}
            controls
            className="max-h-[85vh] max-w-full"
          />
        ) : attachment.type === 'audio' || attachment.meta?.mimetype?.startsWith('audio/') ? (
          <audio
            src={attachment.url}
            controls
            className="w-full min-w-[280px]"
          />
        ) : attachment.type === 'image' || attachment.meta?.mimetype?.startsWith('image/') ? (
          <img
            src={attachment.previewUrl ?? attachment.url ?? ''}
            alt={attachment.description ?? ''}
            className="max-h-[85vh] max-w-full object-contain"
          />
        ) : (
          <div className="bg-card space-y-3 rounded-md p-6 text-center">
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
          className="absolute right-2 top-1/2 z-50 -translate-y-1/2 rounded-md bg-white/15 p-4 text-xl font-bold shadow-xl md:right-4"
          onClick={next}
        >
          →
        </button>
      ) : null}

      <button
        type="button"
        title={t('posts.gallery.close', { defaultValue: 'Close' })}
        className="fixed right-4 top-4 z-50 rounded-md bg-primary px-3 py-2 text-lg font-bold text-primary-foreground shadow-xl"
        onClick={onClose}
      >
        ×
      </button>
    </div>
  );
}
