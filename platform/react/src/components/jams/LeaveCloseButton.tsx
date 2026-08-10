import { useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import {
  Button,
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@openpeepshq/react-ui';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useT } from '../../i18n';
import { useCurrentProfile } from '../layout/IdentityContext';
import { useJamContext } from './JamContext';

/**
 * Leave / close control mirroring the Svelte `LeaveCloseButton`. Moderators are
 * offered a choice between leaving (everyone stays) and closing the jam for
 * everyone; everyone else just disconnects.
 */
export const LeaveCloseButton = () => {
  const t = useT();
  const room = useRoomContext();
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const { jam, jamPost, markIntentionalLeave } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const closeJam = openpeepsApi.closeJamAction({ id: jamPost.id });

  const isModerator = !!me && jam.moderators.includes(me.id);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const leave = async () => {
    markIntentionalLeave();
    await room.disconnect();
    navigate('/jams');
  };

  const handleLeave = async () => {
    setBusy(true);
    try {
      await leave();
    } finally {
      setBusy(false);
    }
  };

  const handleClose = async () => {
    setBusy(true);
    try {
      markIntentionalLeave();
      await closeJam();
      navigate('/jams');
    } finally {
      setBusy(false);
    }
  };

  const handleClick = () => {
    if (isModerator) {
      setConfirmOpen(true);
    } else {
      void handleLeave();
    }
  };

  return (
    <>
      <Button
        variant="variant-filled-error"
        className="rounded-full"
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
              variant="variant-ringed-error"
              disabled={busy}
              action={() => void handleClose()}
            >
              {t('jams.close.confirm')}
            </Button>
            <Button
              variant="variant-filled-error"
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
