import { useState } from 'react';
import type { MediaAttachmentData } from '@openpeepshq/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Label,
  Textarea,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';

export interface DescriptionEditModalProps {
  attachment: MediaAttachmentData;
  open: boolean;
  onClose: () => void;
  onSave: (description: string) => void;
}

/**
 * Edit an already-uploaded attachment's alt text / description, mirroring the
 * Svelte `DescriptionEditModal`. Used by the composer to add accessibility text
 * to images and documents after they finish uploading.
 */
export function DescriptionEditModal({
  attachment,
  open,
  onClose,
  onSave,
}: DescriptionEditModalProps) {
  const t = useT();
  const [description, setDescription] = useState(attachment.description ?? '');

  const saveAndClose = () => {
    onSave(description.trim());
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {t('form.uploadEditModal.description.title', {
              defaultValue: 'Edit description',
            })}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-1">
          <Label htmlFor="attachment-description">
            {t('common.media.altText', { defaultValue: 'Alt text' })}
          </Label>
          <Textarea
            id="attachment-description"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t('form.uploadEditModal.description.placeholder', {
              defaultValue: 'Describe this attachment for accessibility',
            })}
          />
        </div>

        <DialogFooter>
          <Button variant="outline" action={onClose}>
            {t('common.back', { defaultValue: 'Back' })}
          </Button>
          <Button variant="default" action={saveAndClose}>
            {t('common.done', { defaultValue: 'Done' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
