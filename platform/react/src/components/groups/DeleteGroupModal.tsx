import { useState } from 'react';
import type { GroupWithMeta } from '@openpeeps/common/types';
import { groupName } from '@openpeeps/common/lib';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeeps/react-ui';
import { useRouter } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';

export interface DeleteGroupModalProps {
  group: GroupWithMeta;
  onClose: () => void;
}

export function DeleteGroupModal({ group, onClose }: DeleteGroupModalProps) {
  const t = useT();
  const router = useRouter();
  const { openpeepsApi } = useOpenpeeps();
  const deleteGroup = openpeepsApi.deleteGroupAction({ id: group.id });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await deleteGroup();
      onClose();
      router.back();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>
            {t('groups.delete.title', { defaultValue: 'Delete group' })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('groups.delete.description', {
            defaultValue: 'Delete {{groupName}} permanently?',
            groupName: groupName(group),
          })}
        </p>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="variant-ringed-surface" action={onClose}>
            {t('groups.delete.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="variant-filled-error"
            action={submit}
            disabled={submitting}
          >
            {t('groups.delete.deleteButton', { defaultValue: 'Delete' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
