import { useState } from 'react';
import type { GroupWithMeta, PublicProfile } from '@openpeepshq/common/types';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';

export interface ConfirmMemberRemovalModalProps {
  group: GroupWithMeta;
  profile: PublicProfile;
  onClose: () => void;
}

export function ConfirmMemberRemovalModal({
  group,
  profile,
  onClose,
}: ConfirmMemberRemovalModalProps) {
  const t = useT();
  const { openpeepsApi } = useOpenpeeps();
  const removeMember = openpeepsApi.removeGroupMemberAction({
    id: group.id,
    memberId: profile.id,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await removeMember();
      onClose();
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
            {t('groups.removeMember.title', { defaultValue: 'Remove member' })}
          </DialogTitle>
        </DialogHeader>
        <p className="px-1 text-sm">
          {t('groups.removeMember.description', {
            defaultValue: 'Remove @{{handle}} from this group?',
            handle: profile.handle,
          })}
        </p>
        {error ? (
          <p className="border-error/40 text-error rounded-md border p-2 text-sm">
            {error}
          </p>
        ) : null}
        <DialogFooter>
          <Button variant="outline" action={onClose}>
            {t('common.cancel', { defaultValue: 'Cancel' })}
          </Button>
          <Button variant="destructive" action={submit} disabled={submitting}>
            {t('groups.removeMember.confirm', { defaultValue: 'Remove' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
