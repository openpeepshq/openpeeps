import { useCallback, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@openpeeps/react-ui';
import { useT } from '../../i18n';
import {
  convertToWebpIfHeic,
  getCroppedImg,
} from '../../lib/canvasUtils';

export interface ImageEditModalProps {
  file: File;
  previewUrl: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File, description: string) => void;
  /** When false, skip alt-text input (profile/group avatars). */
  showAltInput?: boolean;
  /** Round mask for avatar crops. */
  cropShape?: 'rect' | 'round';
}

const ASPECT_RATIOS = [
  { label: 'Original', value: undefined },
  { label: '1:1', value: 1 },
  { label: '4:3', value: 4 / 3 },
  { label: '16:9', value: 16 / 9 },
  { label: '3:4', value: 3 / 4 },
  { label: '9:16', value: 9 / 16 },
];

export function ImageEditModal({
  file,
  previewUrl,
  open,
  onClose,
  onConfirm,
  showAltInput = true,
  cropShape = 'rect',
}: ImageEditModalProps) {
  const t = useT();
  const [description, setDescription] = useState('');
  const [aspectIndex, setAspectIndex] = useState(0);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const aspect = ASPECT_RATIOS[aspectIndex]?.value;

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const confirm = async () => {
    setSubmitting(true);
    try {
      let processed = await convertToWebpIfHeic(file);
      if (aspect && croppedAreaPixels) {
        processed = await getCroppedImg(processed, croppedAreaPixels);
      }
      onConfirm(processed, description.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('posts.form.editImage', { defaultValue: 'Edit image' })}
          </DialogTitle>
        </DialogHeader>

        <div className="relative h-64 w-full overflow-hidden rounded-md bg-black">
          <Cropper
            image={previewUrl}
            crop={crop}
            zoom={zoom}
            aspect={aspect}
            cropShape={cropShape}
            showGrid={!!aspect}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="zoom-range">
            {t('posts.form.zoom', { defaultValue: 'Zoom' })}
          </Label>
          <input
            id="zoom-range"
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(Number(e.target.value))}
            className="w-full"
          />
        </div>

        <div className="space-y-1">
          <Label htmlFor="aspect-ratio">
            {t('posts.form.aspectRatio', { defaultValue: 'Crop ratio' })}
          </Label>
          <select
            id="aspect-ratio"
            className="w-full rounded-md border px-3 py-2 text-sm"
            value={aspectIndex}
            onChange={(e) => setAspectIndex(Number(e.target.value))}
          >
            {ASPECT_RATIOS.map((item, index) => (
              <option key={item.label} value={index}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {showAltInput ? (
          <div className="space-y-1">
            <Label htmlFor="alt-text">
              {t('common.media.altText', { defaultValue: 'Alt text' })}
            </Label>
            <Textarea
              id="alt-text"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('common.media.altTextDescription', {
                defaultValue: 'Describe the image for accessibility',
              })}
            />
          </div>
        ) : null}

        <DialogFooter>
          <Button variant="variant-ghost-primary" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="variant-filled-primary"
            action={confirm}
            disabled={submitting}
          >
            {submitting
              ? t('common.uploading', { defaultValue: 'Uploading…' })
              : t('common.add', { defaultValue: 'Add' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
