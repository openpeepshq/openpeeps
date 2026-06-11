import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon, Loader2, X } from 'lucide-react';
import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { convertToWebpIfHeic } from '../../lib/canvasUtils';
import { ImageEditModal } from './ImageEditModal';

export interface ImageInputProps {
  usage: string;
  url?: string;
  onChange: (url: string | undefined) => void;
  /** Bold call-to-action shown in the empty state. */
  text?: string;
  /** Smaller hint shown below the call-to-action. */
  specsText?: string;
  /** Show the alt-text field inside the crop modal. */
  showAltInput?: boolean;
  /** Extra classes for the drop-zone (e.g. aspect ratio overrides). */
  className?: string;
  /** When true, show the full image (contain) instead of cropping to cover. */
  showFullImage?: boolean;
  /**
   * `full` is the dashed banner drop-zone; `avatar` is a round picker with a
   * camera badge (mirrors the Svelte `displayType`).
   */
  displayType?: 'full' | 'avatar';
  /** Fixed crop ratio (`"w:h"`) forwarded to the crop modal. */
  aspectRatio?: string;
  /** Show the crop-ratio picker in the modal (free crop). */
  showSelectAspectRatio?: boolean;
}

/**
 * Image picker mirroring the Svelte `ImageInput`. `displayType="full"` is a
 * dashed box that prompts for an upload when empty and shows the image as a
 * cover with replace/remove controls once set; `displayType="avatar"` is a
 * round picker with a camera badge. Cropping happens in `ImageEditModal`; the
 * cropped file is uploaded and the resulting URL is reported via `onChange`.
 */
export function ImageInput({
  usage,
  url,
  onChange,
  text,
  specsText,
  showAltInput = false,
  className,
  showFullImage = false,
  displayType = 'full',
  aspectRatio,
  showSelectAspectRatio,
}: ImageInputProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { upload } = openpeepsApi.useMediaUpload();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<{
    file: File;
    previewUrl: string;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const isAvatar = displayType === 'avatar';

  const pickFile = (file: File) => {
    void (async () => {
      const processed = await convertToWebpIfHeic(file);
      setPendingImage({
        file: processed,
        previewUrl: URL.createObjectURL(processed),
      });
    })();
  };

  const clearPending = () => {
    if (pendingImage) URL.revokeObjectURL(pendingImage.previewUrl);
    setPendingImage(null);
  };

  const fileInput = (
    <input
      ref={fileInputRef}
      type="file"
      accept="image/*"
      className="hidden"
      onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) pickFile(file);
        e.target.value = '';
      }}
    />
  );

  const cropModal = pendingImage ? (
    <ImageEditModal
      file={pendingImage.file}
      previewUrl={pendingImage.previewUrl}
      open
      showAltInput={showAltInput}
      cropShape={isAvatar ? 'round' : 'rect'}
      aspectRatio={aspectRatio}
      showSelectAspectRatio={showSelectAspectRatio}
      onClose={clearPending}
      onConfirm={async (file) => {
        clearPending();
        setLoading(true);
        try {
          const attachment = await upload({ file, usage });
          onChange(attachment.url ?? undefined);
        } finally {
          setLoading(false);
        }
      }}
    />
  ) : null;

  if (isAvatar) {
    return (
      <div className={`relative size-24 ${className ?? ''}`}>
        <button
          type="button"
          className={`flex size-24 items-center justify-center overflow-hidden rounded-full bg-cover bg-center ${url ? '' : 'bg-surface-300 text-muted-foreground'}`}
          style={url ? { backgroundImage: `url(${url})` } : undefined}
          onClick={() => fileInputRef.current?.click()}
          title={t('form.headerAvatarInput.avatar', {
            defaultValue: 'Profile photo',
          })}
        >
          {url ? null : <ImageIcon className="size-8" />}
        </button>
        <span
          className={`bg-surface-200 pointer-events-none absolute bottom-0 right-0 flex size-9 items-center justify-center rounded-full ${url ? 'opacity-80' : ''}`}
        >
          <Camera className="size-5" />
        </span>
        {loading ? (
          <span className="bg-surface-100/80 absolute inset-0 z-20 flex items-center justify-center rounded-full">
            <Loader2 className="size-6 animate-spin" />
          </span>
        ) : null}
        {fileInput}
        {cropModal}
      </div>
    );
  }

  return (
    <div
      className={`bg-surface-200 relative flex h-52 w-full items-center justify-center overflow-hidden rounded border border-dashed bg-center bg-no-repeat ${showFullImage ? 'bg-contain' : 'bg-cover'} ${className ?? ''}`}
      style={url ? { backgroundImage: `url(${url})` } : undefined}
    >
      {url ? (
        <div className="relative z-10 flex items-center gap-4">
          <button
            type="button"
            title={t('form.imageInput.replace', {
              defaultValue: 'Replace image',
            })}
            className="bg-surface-200/80 flex size-10 items-center justify-center rounded-full"
            onClick={() => fileInputRef.current?.click()}
          >
            <Camera className="size-5" />
          </button>
          <button
            type="button"
            title={t('form.imageInput.remove', {
              defaultValue: 'Remove image',
            })}
            className="bg-surface-200/80 flex size-10 items-center justify-center rounded-full"
            onClick={() => onChange(undefined)}
          >
            <X className="size-5" />
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="text-muted-foreground flex size-full flex-col items-center justify-center gap-1"
          onClick={() => fileInputRef.current?.click()}
        >
          <Camera className="size-8" />
          <span className="font-bold">
            {text ??
              t('form.imageInput.uploadText', { defaultValue: 'Upload Image' })}
          </span>
          {specsText ? <span className="text-sm">{specsText}</span> : null}
        </button>
      )}

      {loading ? (
        <span className="bg-surface-100/80 absolute inset-0 z-20 flex items-center justify-center">
          <Loader2 className="size-8 animate-spin" />
        </span>
      ) : null}

      {fileInput}
      {cropModal}
    </div>
  );
}
