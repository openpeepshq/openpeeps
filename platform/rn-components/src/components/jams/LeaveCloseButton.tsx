import React, { useEffect } from 'react';
import { Alert } from 'react-native';
import { useRoomContext } from '@livekit/react-native';
import { useTranslation } from 'react-i18next';
import { useJamContext, useLeaveCloseJam } from '@openpeepshq/react';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';

/**
 * Leave / close control. Moderators are offered a choice between leaving
 * (everyone stays) and closing the jam for everyone; everyone else just
 * disconnects. The web dialog is a native alert here.
 */
export const LeaveCloseButton = () => {
  const { t } = useTranslation();
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

  useEffect(() => {
    if (!confirmOpen) return;
    Alert.alert(t('jams.exit.title'), t('jams.exit.closeOrExit.description'), [
      { text: t('jams.close.confirm'), onPress: () => void handleClose() },
      {
        text: t('jams.exit.confirm'),
        style: 'destructive',
        onPress: () => void handleLeave(),
      },
      { style: 'cancel', text: t('common.cancel') },
    ]);
    setConfirmOpen(false);
  }, [confirmOpen, handleClose, handleLeave, setConfirmOpen, t]);

  return (
    <Button
      variant="destructive"
      size="sm"
      accessibilityLabel={t('jams.exit.confirm')}
      disabled={busy}
      onPress={handleClick}
    >
      <ThemedText className="text-sm text-destructive-foreground">
        {t('jams.exit.confirm')}
      </ThemedText>
    </Button>
  );
};
