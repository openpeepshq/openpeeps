import { useState } from 'react';
import { useRoomContext } from '@livekit/components-react';
import { Button } from '@openpeeps/react-ui';
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
  const { jam, jamPost } = useJamContext();
  const { openpeepsApi } = useOpenpeeps();
  const closeJam = openpeepsApi.closeJamAction({ id: jamPost.id });

  const isModerator = !!me && jam.moderators.includes(me.id);
  const [busy, setBusy] = useState(false);

  const leave = async () => {
    await room.disconnect();
    navigate('/jams');
  };

  const handleClick = async () => {
    setBusy(true);
    try {
      if (!isModerator) {
        await leave();
        return;
      }
      // OK leaves the jam (everyone stays); Cancel closes it for everyone,
      // mirroring the Svelte close-or-exit modal.
      if (window.confirm(t('jams.exit.closeOrExit.description'))) {
        await leave();
      } else {
        await closeJam();
        navigate('/jams');
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Button
      variant="variant-filled-error"
      className="rounded-full"
      title={t('jams.exit.confirm')}
      disabled={busy}
      action={() => void handleClick()}
    >
      {t('jams.exit.confirm')}
    </Button>
  );
};
