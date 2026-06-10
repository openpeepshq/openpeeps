import { useEffect, useRef, useState, type ReactNode } from 'react';
import { Image, Paperclip } from 'lucide-react';
import type { MediaAttachment, MediaAttachmentData } from '@openpeeps/common';
import { useT } from '../../../i18n';
import { ImageEditModal } from '../../form/ImageEditModal';
import { convertToWebpIfHeic } from '../../../lib/canvasUtils';
import { AttachmentCard, type ComposeItem } from './AttachmentCard';

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

const newKey = (): string =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readyItem = (attachment: MediaAttachmentData): ComposeItem => ({
  key: newKey(),
  usage: attachment.meta?.usage ?? 'unknown',
  attachment,
  previewUrl: attachment.previewUrl ?? attachment.url ?? undefined,
});

export interface ComposeAttachmentsApi {
  openImagePicker: () => void;
  openDocumentPicker: () => void;
  /** True while any attachment is still uploading or processing. */
  pending: boolean;
  /** Attachment cards — render where the previews should appear. */
  previews: ReactNode;
  /** Hidden file inputs + image cropper — render once anywhere in the tree. */
  inputs: ReactNode;
}

/**
 * Owns the attachment list and its upload lifecycle. Each item is shown
 * immediately as a card with byte-upload and server-processing progress
 * (mirrors the Svelte `Attachments` + `AttachmentContainer`), and only ready
 * attachments are reported back via `onChange`. Exposes the toolbar pickers and
 * preview grid separately so callers can lay them out independently.
 */
export function useComposeAttachments({
  attachments,
  onChange,
}: ComposeAttachmentsProps): ComposeAttachmentsApi {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const documentInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);

  // `attachments` seeds the list once; thereafter the items are the source of
  // truth (so in-flight upload/processing state isn't clobbered by re-renders).
  const [items, setItems] = useState<ComposeItem[]>(() =>
    attachments.map(readyItem),
  );

  // Report only ready attachments upward; uploading/processing/failed ones stay
  // local until they resolve (matching the Svelte submit-gating model).
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  useEffect(() => {
    const ready = items
      .filter(
        (i) => i.attachment && !i.failed && i.attachment.status !== 'processing',
      )
      .map((i) => i.attachment as MediaAttachmentData);
    onChangeRef.current(ready);
  }, [items]);

  const enqueue = (
    file: File,
    usage: string,
    description?: string,
    previewUrl?: string,
  ) => {
    setItems((prev) => [
      ...prev,
      { key: newKey(), file, usage, description, previewUrl },
    ]);
  };

  const enqueueFile = (file: File) => {
    const usage = usageForFile(file);
    const previewUrl =
      file.type.startsWith('image/') || file.type.startsWith('video/')
        ? URL.createObjectURL(file)
        : undefined;
    enqueue(
      file,
      usage,
      usage === 'post-document' ? file.name : undefined,
      previewUrl,
    );
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
    enqueueFile(processed);
  };

  const onUploaded = (key: string, attachment: MediaAttachment) =>
    setItems((prev) =>
      prev.map((i) =>
        i.key === key
          ? {
              ...i,
              file: undefined,
              attachment,
              previewUrl: attachment.previewUrl ?? i.previewUrl,
            }
          : i,
      ),
    );

  const onProcessed = (key: string, attachment: MediaAttachmentData) =>
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, attachment } : i)),
    );

  const onFailed = (key: string, error?: string) =>
    setItems((prev) =>
      prev.map((i) => (i.key === key ? { ...i, failed: true, error } : i)),
    );

  const onRemove = (key: string) =>
    setItems((prev) => prev.filter((i) => i.key !== key));

  const pending = items.some(
    (i) =>
      (i.file && !i.attachment && !i.failed) ||
      i.attachment?.status === 'processing',
  );

  const previews =
    items.length > 0 ? (
      <div className="grid grid-cols-2 gap-2">
        {items.map((item) => (
          <AttachmentCard
            key={item.key}
            item={item}
            onUploaded={onUploaded}
            onProcessed={onProcessed}
            onFailed={onFailed}
            onRemove={onRemove}
          />
        ))}
      </div>
    ) : null;

  const inputs = (
    <>
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
          if (file) enqueueFile(file);
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
            enqueue(file, 'post-image', description, URL.createObjectURL(file));
          }}
        />
      ) : null}
    </>
  );

  return {
    openImagePicker: () => imageInputRef.current?.click(),
    openDocumentPicker: () => documentInputRef.current?.click(),
    pending,
    previews,
    inputs,
  };
}

export function ComposeAttachments(props: ComposeAttachmentsProps) {
  const t = useT();
  const { openImagePicker, openDocumentPicker, previews, inputs } =
    useComposeAttachments(props);

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          title={t('posts.form.addImage', { defaultValue: 'Add image or video' })}
          onClick={openImagePicker}
          className="hover:bg-surface-200 rounded-md p-2"
        >
          <Image className="size-5" />
        </button>
        <button
          type="button"
          title={t('posts.form.addDocument', { defaultValue: 'Add document' })}
          onClick={openDocumentPicker}
          className="hover:bg-surface-200 rounded-md p-2"
        >
          <Paperclip className="size-5" />
        </button>
      </div>

      {previews}
      {inputs}
    </div>
  );
}
