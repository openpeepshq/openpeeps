import { useState } from 'react';
import type { GroupWithMeta } from '@openpeeps/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeeps/react-ui';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';

export interface ConfirmGroupExitModalProps {
  group: GroupWithMeta;
  onClose: () => void;
}

export function ConfirmGroupExitModal({
  group,
  onClose,
}: ConfirmGroupExitModalProps) {
  const t = useT();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const leaveGroup = openpeepsApi.leaveGroupAction({ id: group.id });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await leaveGroup();
      onClose();
      navigate('/groups');
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
            {t('groups.modals.confirmExit.title', {
              defaultValue: 'Leave group',
            })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('groups.modals.confirmExit.body', {
            defaultValue: 'Leave @{{handle}}?',
            handle: group.handle,
          })}
        </p>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="variant-ringed-primary" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button
            variant="variant-filled-error"
            action={submit}
            disabled={submitting}
          >
            {t('groups.modals.confirmExit.leave', { defaultValue: 'Leave' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
