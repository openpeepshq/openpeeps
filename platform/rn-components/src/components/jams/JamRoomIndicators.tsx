import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useLocalParticipant } from '@livekit/react-native';
import { ConnectionQuality } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { useJamRecordingState } from '@openpeepshq/react';
import { CircleIcon, XIcon } from '~/components/icons';
import { ThemedText } from '~/components/ui/themed-text';
import { useConnectionQuality } from './useParticipantConnection';

/** Red "recording" pill shown to every participant while egress is active. */
export const JamRecordingIndicator = () => {
  const { t } = useTranslation();
  const { isRecording } = useJamRecordingState();

  if (!isRecording) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute left-4 top-4 z-50 flex-row items-center gap-2 rounded-full bg-destructive/90 px-3 py-1"
    >
      <CircleIcon
        size={12}
        className="fill-destructive-foreground text-destructive-foreground"
      />
      <ThemedText className="text-sm font-medium text-destructive-foreground">
        {t('events.recordingInProgress')}
      </ThemedText>
    </View>
  );
};

/** Dismissable banner shown when the local connection quality degrades. */
export const JamNetworkQuality = () => {
  const { t } = useTranslation();
  const { localParticipant } = useLocalParticipant();
  const quality = useConnectionQuality(localParticipant);
  const [dismissed, setDismissed] = useState(false);

  const poor =
    quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;

  if (!poor || dismissed) return null;

  return (
    <View className="absolute left-4 right-4 top-4 z-50 flex-row items-center gap-3 rounded-lg bg-accent/90 px-4 py-2">
      <ThemedText className="flex-1 text-sm text-accent-foreground">
        <ThemedText className="text-sm font-medium text-accent-foreground">
          {t('jams.network.connectionStatus')}
        </ThemedText>{' '}
        {t('jams.network.connectionDetail', { quality })}
      </ThemedText>
      <Pressable
        accessibilityLabel={t('jams.network.dismiss')}
        onPress={() => setDismissed(true)}
      >
        <XIcon size={16} className="text-accent-foreground" />
      </Pressable>
    </View>
  );
};
