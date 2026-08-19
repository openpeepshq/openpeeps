import { useState } from 'react';
import { useT, useOpenpeeps } from '../../../index';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';

export interface RestoreBackupModalProps {
  onClose: () => void;
}

export function RestoreBackupModal({ onClose }: RestoreBackupModalProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const restoreBackup = openpeepsApi.admin.restoreBackupAction();
  const [file, setFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!file) {
      setError(
        t('admin.backups.restore.selectFile', { defaultValue: 'Select File' }),
      );
      return;
    }
    setError(null);
    setSubmitting(true);
    try {
      await restoreBackup(file);
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('admin.backups.restore.title', {
              defaultValue: 'Restore backup',
            })}
          </DialogTitle>
        </DialogHeader>
        <div className="px-1">
          <input
            type="file"
            accept=".zip"
            className="w-full rounded-md border p-2 text-sm"
            onChange={(e) => setFile(e.target.files?.item(0) ?? null)}
          />
        </div>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogActions
          cancelLabel={t('admin.backups.restore.cancel', {
            defaultValue: 'Cancel',
          })}
          onCancel={onClose}
          actionLabel={t('admin.backups.restore.confirm', {
            defaultValue: 'Confirm',
          })}
          onAction={submit}
          disabled={!file || submitting}
        />
      </DialogContent>
    </Dialog>
  );
}
