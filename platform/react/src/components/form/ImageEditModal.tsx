import { useState } from 'react';
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
  centerCropToAspectRatio,
  convertToWebpIfHeic,
} from '../../lib/canvasUtils';

export interface ImageEditModalProps {
  file: File;
  previewUrl: string;
  open: boolean;
  onClose: () => void;
  onConfirm: (file: File, description: string) => void;
}

const ASPECT_RATIOS = [
  { label: 'Original', value: null },
  { label: '1:1', value: [1, 1] as const },
  { label: '4:3', value: [4, 3] as const },
  { label: '16:9', value: [16, 9] as const },
];

export function ImageEditModal({
  file,
  previewUrl,
  open,
  onClose,
  onConfirm,
}: ImageEditModalProps) {
  const t = useT();
  const [description, setDescription] = useState('');
  const [aspectIndex, setAspectIndex] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const confirm = async () => {
    setSubmitting(true);
    try {
      let processed = await convertToWebpIfHeic(file);
      const aspect = ASPECT_RATIOS[aspectIndex]?.value;
      if (aspect) {
        processed = await centerCropToAspectRatio(processed, aspect[0], aspect[1]);
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

        <img
          src={previewUrl}
          alt=""
          className="max-h-64 w-full rounded-md object-contain"
        />

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
