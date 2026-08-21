import { useState } from 'react';
import { useNavigate } from '../../contexts/router';
import { useOpenpeeps } from '../../contexts/openpeeps';
import { useCurrentProfile } from '../../components/layout/IdentityContext';

export type UseLeaveCloseJamArgs = {
  jamPostId: string;
  moderatorIds: string[];
  occurrence?: string;
  /** Host supplies room disconnect (LiveKit / native). */
  disconnect: () => Promise<void> | void;
  markIntentionalLeave: () => void;
};

/**
 * Non-DOM leave/close jam controller. UI supplies `disconnect`; this owns
 * confirm state, close API, and navigation targets.
 */
export const useLeaveCloseJam = ({
  jamPostId,
  moderatorIds,
  occurrence,
  disconnect,
  markIntentionalLeave,
}: UseLeaveCloseJamArgs) => {
  const navigate = useNavigate();
  const me = useCurrentProfile();
  const { openpeepsApi } = useOpenpeeps();
  const closeJam = openpeepsApi.closeJamAction({ id: jamPostId } as never);

  const isModerator = !!me && moderatorIds.includes(me.id);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);

  const leave = async () => {
    markIntentionalLeave();
    navigate({ type: 'jams' });
    await disconnect();
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
      await closeJam(undefined, occurrence ? { occurrence } : undefined);
      navigate({ type: 'jams' });
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

  return {
    isModerator,
    busy,
    confirmOpen,
    setConfirmOpen,
    handleClick,
    handleLeave,
    handleClose,
  };
};
