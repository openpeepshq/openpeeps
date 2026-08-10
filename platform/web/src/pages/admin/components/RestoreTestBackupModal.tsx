import { useState } from 'react';
import { useT, useOpenpeeps } from '@openpeepshq/react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';

export interface RestoreTestBackupModalProps {
  onClose: () => void;
}

export function RestoreTestBackupModal({
  onClose,
}: RestoreTestBackupModalProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const restoreBackup = openpeepsApi.admin.restoreBackupAction();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      const name = 'test-backup.zip';
      const response = await fetch(`/template/${name}`);
      const blob = await response.blob();
      const file = new File([blob], name, { type: 'application/zip' });
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
            {t('admin.backups.testRestore.title', {
              defaultValue: 'Restore test data',
            })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('admin.backups.testRestore.confirm', {
            defaultValue:
              'This will restore sample test data into the community. Are you sure?',
          })}
        </p>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="variant-ringed-primary" action={onClose}>
            {t('admin.backups.testRestore.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="variant-filled-primary"
            action={submit}
            disabled={submitting}
          >
            {t('admin.backups.testRestore.continue', {
              defaultValue: 'Continue',
            })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
