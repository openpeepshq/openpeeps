import { useRef, useState } from 'react';
import { Camera, Image as ImageIcon } from 'lucide-react';
import { Button } from '@openpeeps/react-ui';
import { useT } from '../../i18n';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { convertToWebpIfHeic } from '../../lib/canvasUtils';
import { ImageEditModal } from './ImageEditModal';

export interface HeaderAvatarInputProps {
  header?: string;
  avatar?: string;
  onHeaderChange: (url: string) => void;
  onAvatarChange: (url: string) => void;
}

type PendingImage = {
  file: File;
  previewUrl: string;
  target: 'header' | 'avatar';
};

export function HeaderAvatarInput({
  header,
  avatar,
  onHeaderChange,
  onAvatarChange,
}: HeaderAvatarInputProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const { upload } = openpeepsApi.useMediaUpload();

  const headerInputRef = useRef<HTMLInputElement>(null);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const [pendingImage, setPendingImage] = useState<PendingImage | null>(null);

  const pickImage = async (
    file: File,
    target: PendingImage['target'],
  ) => {
    const processed = await convertToWebpIfHeic(file);
    if (processed.type.startsWith('image/')) {
      setPendingImage({
        file: processed,
        previewUrl: URL.createObjectURL(processed),
        target,
      });
      return;
    }
    const attachment = await upload({
      file: processed,
      usage: target === 'header' ? 'header-image' : 'avatar-image',
    });
    const url = attachment.url ?? '';
    if (target === 'header') onHeaderChange(url);
    else onAvatarChange(url);
  };

  const confirmPending = async (file: File) => {
    if (!pendingImage) return;
    const attachment = await upload({
      file,
      usage:
        pendingImage.target === 'header' ? 'header-image' : 'avatar-image',
    });
    const url = attachment.url ?? '';
    if (pendingImage.target === 'header') onHeaderChange(url);
    else onAvatarChange(url);
  };

  return (
    <div className="relative mb-16 w-full">
      <input
        ref={headerInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pickImage(file, 'header');
          e.target.value = '';
        }}
      />
      <input
        ref={avatarInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void pickImage(file, 'avatar');
          e.target.value = '';
        }}
      />

      <div className="bg-surface-200 relative h-44 w-full overflow-hidden rounded-md">
        {header ? (
          <img
            src={header}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <ImageIcon className="text-muted-foreground size-10" />
          </div>
        )}
        <Button
          variant="variant-ringed-surface"
          action={() => headerInputRef.current?.click()}
          className="absolute bottom-2 right-2"
          title={t('form.headerAvatarInput.coverImage', {
            defaultValue: 'Cover image',
          })}
        >
          <Camera className="size-4" />
        </Button>
      </div>

      <div className="absolute -bottom-12 left-4">
        <button
          type="button"
          title={t('form.headerAvatarInput.avatar', {
            defaultValue: 'Profile photo',
          })}
          className="relative block"
          onClick={() => avatarInputRef.current?.click()}
        >
          {avatar ? (
            <img
              src={avatar}
              alt=""
              className="size-24 rounded-full border-4 border-background object-cover"
            />
          ) : (
            <div className="bg-surface-100 text-muted-foreground flex size-24 items-center justify-center rounded-full border-4 border-background text-2xl font-medium">
              ?
            </div>
          )}
          <span className="bg-background absolute bottom-1 right-1 rounded-full border p-1">
            <Camera className="size-3" />
          </span>
        </button>
      </div>

      {pendingImage ? (
        <ImageEditModal
          file={pendingImage.file}
          previewUrl={pendingImage.previewUrl}
          open
          showAltInput={false}
          cropShape={pendingImage.target === 'avatar' ? 'round' : 'rect'}
          onClose={() => setPendingImage(null)}
          onConfirm={(file) => {
            void confirmPending(file);
          }}
        />
      ) : null}
    </div>
  );
}
