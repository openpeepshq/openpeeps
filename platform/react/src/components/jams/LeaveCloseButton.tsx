import { useRoomContext } from '@livekit/components-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import { useLeaveCloseJam } from '../../hooks/jams/useLeaveCloseJam';
import { useJamContext } from './JamContext';

/**
 * Leave / close control mirroring the Svelte `LeaveCloseButton`. Moderators are
 * offered a choice between leaving (everyone stays) and closing the jam for
 * everyone; everyone else just disconnects.
 */
export const LeaveCloseButton = () => {
  const t = useT();
  const room = useRoomContext();
  const { jam, jamPost, occurrence, markIntentionalLeave } = useJamContext();
  const {
    busy,
    confirmOpen,
    setConfirmOpen,
    handleClick,
    handleLeave,
    handleClose,
  } = useLeaveCloseJam({
    jamPostId: jamPost.id,
    moderatorIds: jam.moderators,
    occurrence,
    disconnect: () => room.disconnect(),
    markIntentionalLeave,
  });

  return (
    <>
      <Button
        variant="destructive"
        title={t('jams.exit.confirm')}
        disabled={busy}
        action={handleClick}
      >
        {t('jams.exit.confirm')}
      </Button>
      <Dialog
        open={confirmOpen}
        onOpenChange={(open) => !open && setConfirmOpen(false)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('jams.exit.title')}</DialogTitle>
          </DialogHeader>
          <p className="px-1 text-sm">
            {t('jams.exit.closeOrExit.description')}
          </p>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={busy}
              action={() => void handleClose()}
            >
              {t('jams.close.confirm')}
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              action={() => void handleLeave()}
            >
              {t('jams.exit.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
