import { useRef, useState } from 'react';
import { Image, Paperclip, X } from 'lucide-react';
import type { MediaAttachmentData } from '@openpeeps/common/types';
import { useOpenpeeps } from '../../../contexts/openpeeps';
import { useT } from '../../../i18n';
import { ImageEditModal } from '../../form/ImageEditModal';
import { convertToWebpIfHeic } from '../../../lib/canvasUtils';

export interface ComposeAttachmentsProps {
  attachments: MediaAttachmentData[];
  onChange: (attachments: MediaAttachmentData[]) => void;
}

function usageForFile(file: File): string {
  if (file.type.startsWith('image/')) return 'post-image';
  if (file.type.startsWith('video/') || file.name.endsWith('.mkv'))
    return 'post-video';
  return 'post-document';
}

export function ComposeAttachments({
  attachments,
  onChange,
}: ComposeAttachmentsProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { upload, state } = openpeepsApi.useMediaUpload();
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  const uploadFile = async (file: File, description?: string) => {
    const attachment = await upload({
      file,
      usage: usageForFile(file),
      description: description ?? file.name,
    });
    onChange([
      ...attachments,
      {
        type: attachment.type,
        url: attachment.url,
        previewUrl: attachment.previewUrl,
        textUrl: attachment.textUrl,
        filename: attachment.filename,
        description: attachment.description,
        meta: attachment.meta,
      },
    ]);
  };

  const handleImageSelected = async (file: File) => {
    const processed = await convertToWebpIfHeic(file);
    if (processed.type.startsWith('image/')) {
      setPendingImage({
        file: processed,
        previewUrl: URL.createObjectURL(processed),
      });
      return;
    }
    await uploadFile(processed);
  };

  const remove = (index: number) => {
    onChange(attachments.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          title={t('posts.form.addImage', { defaultValue: 'Add image or video' })}
          onClick={() => imageInputRef.current?.click()}
          className="hover:bg-surface-200 rounded-md p-2"
        >
          <Image className="size-5" />
        </button>
        <button
          type="button"
          title={t('posts.form.addDocument', { defaultValue: 'Add document' })}
          onClick={() => documentInputRef.current?.click()}
          className="hover:bg-surface-200 rounded-md p-2"
        >
          <Paperclip className="size-5" />
        </button>
        {state.uploading ? (
          <span className="text-muted-foreground text-xs">
            {t('common.uploading', { defaultValue: 'Uploading…' })}{' '}
            {state.uploadPercent}%
          </span>
        ) : null}
      </div>

      {attachments.length > 0 ? (
        <div className="grid grid-cols-2 gap-2">
          {attachments.map((attachment, index) => (
            <div
              key={`${attachment.url}-${index}`}
              className="bg-surface-100 relative overflow-hidden rounded-md border p-2 text-xs"
            >
              <button
                type="button"
                className="absolute right-1 top-1 rounded-full bg-background/80 p-1"
                onClick={() => remove(index)}
              >
                <X className="size-3" />
              </button>
              {attachment.previewUrl || attachment.url ? (
                attachment.meta?.mimetype?.startsWith('image/') ? (
                  <img
                    src={attachment.previewUrl ?? attachment.url ?? ''}
                    alt={attachment.description ?? 'attachment'}
                    className="aspect-video w-full object-cover"
                  />
                ) : (
                  <p className="truncate pt-4">
                    {attachment.filename ?? attachment.description ?? 'File'}
                  </p>
                )
              ) : (
                <p className="truncate pt-4">{attachment.filename}</p>
              )}
            </div>
          ))}
        </div>
      ) : null}

      <input
        ref={imageInputRef}
        type="file"
        accept="image/*,video/*,.mkv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void handleImageSelected(file);
          e.target.value = '';
        }}
      />
      <input
        ref={documentInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt,.md,.csv"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void uploadFile(file);
          e.target.value = '';
        }}
      />

      {pendingImage ? (
        <ImageEditModal
          file={pendingImage.file}
          previewUrl={pendingImage.previewUrl}
          open
          onClose={() => {
            URL.revokeObjectURL(pendingImage.previewUrl);
            setPendingImage(null);
          }}
          onConfirm={(file, description) => {
            URL.revokeObjectURL(pendingImage.previewUrl);
            setPendingImage(null);
            void uploadFile(file, description);
          }}
        />
      ) : null}
    </div>
  );
}
