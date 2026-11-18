import React, { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useLocalParticipant } from '@livekit/react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ConnectionQuality } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import {
  useJamRecordingElapsed,
  useJamRecordingState,
  useJamExternalSessions,
} from '@openpeepshq/react';
import { CircleIcon, EyeOnIcon, XIcon } from '../icons/index';
import { ThemedText } from '../ui/themed-text';
import { useThemeOpacity } from '../../theme/useThemeOpacity';
import { useConnectionQuality } from './useParticipantConnection';

/** Red "recording" pill shown to every participant while egress is active. */
export const JamRecordingIndicator = () => {
  const { t } = useTranslation();
  const { background } = useThemeOpacity();
  const { isRecording } = useJamRecordingState();
  const elapsed = useJamRecordingElapsed();

  if (!isRecording) return null;

  // NativeWind v4 can't apply `/N` opacity to CSS-variable colors (e.g.
  // `bg-destructive/90`), so the pill background uses an inline rgba style.
  return (
    <View
      pointerEvents="none"
      style={background('destructive', 0.9)}
      className="absolute left-4 top-4 z-50 flex-row items-center gap-2 rounded-full px-3 py-1"
    >
      <CircleIcon
        size={12}
        className="fill-destructive-foreground text-destructive-foreground"
      />
      <ThemedText className="text-sm font-medium text-destructive-foreground">
        {t('events.recordingInProgress')}
        {elapsed ? ` ${elapsed}` : ''}
      </ThemedText>
    </View>
  );
};

/**
 * Eye pill shown to participants while hidden external sessions are
 * connected, top-right. The jam screen has no top header, so the pill clears
 * the safe-area top inset (notch/status bar) plus 16px of margin; toasts
 * (rendered by the host app at the safe-area inset) then win the corner, as
 * the transparency signal is lower priority than user feedback.
 */
export const JamObserverIndicator = () => {
  const { t } = useTranslation();
  const { background } = useThemeOpacity();
  const insets = useSafeAreaInsets();
  const sessions = useJamExternalSessions();

  if (sessions <= 0) return null;

  // NativeWind v4 can't apply `/N` opacity to CSS-variable colors (e.g.
  // `bg-primary/90`), so the pill background uses an inline rgba style.
  return (
    <View
      pointerEvents="none"
      style={[{ top: insets.top + 16, right: 16 }, background('primary', 0.9)]}
      className="z-50 flex-row items-center gap-2 rounded-full px-3 py-1"
    >
      <EyeOnIcon size={16} className="text-primary-foreground" />
      <ThemedText className="text-sm font-medium text-primary-foreground">
        {t('jams.observers.present', { count: sessions })}
      </ThemedText>
    </View>
  );
};

/** Dismissable banner shown when the local connection quality degrades. */
export const JamNetworkQuality = () => {
  const { t } = useTranslation();
  const { background } = useThemeOpacity();
  const { localParticipant } = useLocalParticipant();
  const quality = useConnectionQuality(localParticipant);
  const [dismissed, setDismissed] = useState(false);

  const poor =
    quality === ConnectionQuality.Poor || quality === ConnectionQuality.Lost;

  if (!poor || dismissed) return null;

  return (
    // NativeWind v4 can't apply `/N` opacity to CSS-variable colors (e.g.
    // `bg-accent/90`), so the banner background uses an inline rgba style.
    <View
      style={background('accent', 0.9)}
      className="absolute left-4 right-4 top-4 z-50 flex-row items-center gap-3 rounded-lg px-4 py-2"
    >
      <ThemedText className="flex-1 text-sm text-accent-foreground">
        {/* Raw `Text` (not `ThemedText`) for the bold status label: nesting
            two themed texts would re-apply the base `text-base` defaults. */}
        <Text className="font-medium">
          {t('jams.network.connectionStatus')}
        </Text>{' '}
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
