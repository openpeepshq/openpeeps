import type { PublicPost } from '@openpeepshq/common/types';
import { waitlistOfferWindowMs } from '@openpeepshq/common/lib';
import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';

export type EventWaitlistJoinDialogProps = {
  open: boolean;
  post: PublicPost;
  error?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onConfirm: () => void | Promise<void>;
};

export const EventWaitlistJoinDialog = ({
  open,
  post,
  error,
  submitting,
  onClose,
  onConfirm,
}: EventWaitlistJoinDialogProps) => {
  const t = useT();
  const event = post.data?.type === 'event' ? post.data : undefined;
  const minutes = event
    ? Math.round(waitlistOfferWindowMs(event) / 60_000)
    : 60;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next && !submitting) onClose();
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('events.rsvp.waitlistConfirmTitle', {
              defaultValue: 'Join the waitlist?',
            })}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          {t('events.rsvp.atCapacity', {
            defaultValue: 'This event is at capacity.',
          })}
        </p>
        <p className="text-muted-foreground text-sm">
          {t('events.rsvp.waitlistConfirmBody', {
            defaultValue:
              'If a spot opens, you will have {{minutes}} minutes to claim it.',
            minutes,
          })}
        </p>
        {error ? <p className="text-error text-sm">{error}</p> : null}
        <DialogActions
          cancelLabel={t('events.rsvp.scope.cancel', {
            defaultValue: 'Cancel',
          })}
          onCancel={onClose}
          actionLabel={t('events.rsvp.joinWaitlist', {
            defaultValue: 'Join waitlist',
          })}
          onAction={onConfirm}
          disabled={submitting}
        />
      </DialogContent>
    </Dialog>
  );
};
