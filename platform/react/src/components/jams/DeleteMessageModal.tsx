import {
  Dialog,
  DialogActions,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';

export interface DeleteMessageModalProps {
  open: boolean;
  onClose: () => void;
  /** Returns the promise from the delete so the dialog can report failure. */
  onDelete: () => Promise<void>;
}

/** Destructive confirm dialog for deleting a single jam chat message. */
export function DeleteMessageModal({
  open,
  onClose,
  onDelete,
}: DeleteMessageModalProps) {
  const t = useT();

  const handleDelete = async () => {
    // Error handling is owned by the drawer: the `onDelete` it passes
    // (`JamChatDrawer.handleDeleteMessage`) catches every rejection itself
    // (console log; the failed delete leaves the message in the list, web's
    // only failure signal — RN shows a toast), so the `await` below only
    // keeps the dialog open on failure if a future `onDelete` rejects; today
    // it never does and the dialog always closes.
    await onDelete();
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {t('jams.chat.deleteTitle', { defaultValue: 'Delete message' })}
          </DialogTitle>
        </DialogHeader>
        <p className="text-sm">
          {t('jams.chat.deleteConfirm', {
            defaultValue: 'Are you sure you want to delete this message?',
          })}
        </p>
        <DialogActions
          cancelLabel={t('jams.chat.cancel', { defaultValue: 'Cancel' })}
          onCancel={onClose}
          actionLabel={t('jams.chat.delete', { defaultValue: 'Delete' })}
          onAction={handleDelete}
          actionVariant="destructive"
        />
      </DialogContent>
    </Dialog>
  );
}
