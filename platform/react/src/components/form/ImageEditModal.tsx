import { useCallback, useState } from 'react';
import Cropper, { type Area, type Point } from 'react-easy-crop';
import {
  Badge,
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

const SQUARE_ASPECT_INDEX = ASPECT_RATIOS.findIndex((r) => r.value === 1);

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
  const [aspectIndex, setAspectIndex] = useState(
    cropShape === 'round' && SQUARE_ASPECT_INDEX >= 0 ? SQUARE_ASPECT_INDEX : 0,
  );
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const aspect =
    cropShape === 'round' ? 1 : ASPECT_RATIOS[aspectIndex]?.value;

  const onCropComplete = useCallback((_: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const confirm = async () => {
    setSubmitting(true);
    try {
      let processed = await convertToWebpIfHeic(file);
      // "Original" (no aspect) leaves the image untouched; crop only when a
      // fixed ratio or round mask is selected.
      if (croppedAreaPixels && (aspect || cropShape === 'round')) {
        processed = await getCroppedImg(processed, croppedAreaPixels);
      }
      onConfirm(processed, description.trim());
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  // "Original" (no fixed aspect, rectangular) shows the untouched image; any
  // ratio or the round mask switches to the interactive cropper.
  const isCropping = !!aspect || cropShape === 'round';
  const showAspectRatio = cropShape !== 'round';
  // Mirror the Svelte modal: the cropper shares a row with the crop-ratio /
  // alt-text controls so the dialog stays short. With no side controls (e.g.
  // round avatar crops) the cropper spans the full width.
  const hasSidebar = showAspectRatio || showAltInput;

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {t('posts.form.editImage', { defaultValue: 'Edit image' })}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 sm:flex-row">
          <div className={hasSidebar ? 'sm:w-1/2' : 'w-full'}>
            <div className="relative h-52 w-full overflow-hidden rounded-md bg-black">
              {isCropping ? (
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
              ) : (
                <img
                  src={previewUrl}
                  alt=""
                  className="h-full w-full object-contain"
                />
              )}
            </div>
            {isCropping ? (
              <div className="mt-2 space-y-1">
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
            ) : null}
          </div>

          {hasSidebar ? (
            <div className="space-y-3 sm:w-1/2">
              {showAspectRatio ? (
                <div className="space-y-1">
                  <div className="text-sm font-medium">
                    {t('posts.form.aspectRatio', { defaultValue: 'Crop ratio' })}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {ASPECT_RATIOS.map((item, index) => (
                      <button
                        key={item.label}
                        type="button"
                        title={item.label}
                        onClick={() => setAspectIndex(index)}
                      >
                        <Badge
                          status={item.label}
                          variant={
                            aspectIndex === index
                              ? 'variant-filled-primary'
                              : 'variant-ghost-primary'
                          }
                        />
                      </button>
                    ))}
                  </div>
                </div>
              ) : null}

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
            </div>
          ) : null}
        </div>

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
