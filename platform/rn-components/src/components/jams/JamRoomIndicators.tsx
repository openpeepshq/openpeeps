import React, { useState, type PropsWithChildren } from 'react';
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

/** Red "recording" pill shown to every participant while egress is active.
 * Rendered inside `JamsBannerStack` (the stack is already inset from the
 * screen edges), so it stacks with the other jam banners. */
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
      className="self-start ml-4 flex-row items-center gap-2 rounded-full px-3 py-1"
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
 * Shared stacking container for the jam's transient overlays (network
 * banner, observer banner, recording pill). Each child sits directly below
 * the previous visible one, so they can never overlap each other and any
 * future banner is added in a single place. The container owns the top
 * offset (safe-area inset + 16px, matching the original `top-4` below the
 * safe area), the vertical spacing and the horizontal insets (`left-4
 * right-4`) — so, like the web twin's base top offset and spacing, the
 * banners inside need no side margins of their own; the recording pill
 * keeps its top-left placement via `self-start`.
 */
export const JamsBannerStack = ({ children }: PropsWithChildren) => {
  const insets = useSafeAreaInsets();
  return (
    <View
      pointerEvents="box-none"
      style={{ top: insets.top + 16 }}
      className="absolute left-4 right-4 z-50 gap-2"
    >
      {children}
    </View>
  );
};

/**
 * Dismissible banner shown to participants while hidden external sessions
 * (observer links, recording/RTMP egress) are connected. Rendered inside
 * `JamsBannerStack` (below the network banner). Toasts keep priority over
 * the transparency signal, which is lower priority than user feedback. The
 * Participants list keeps the presence visible after dismissal.
 */
export const JamObserverBanner = () => {
  const { t } = useTranslation();
  const { background } = useThemeOpacity();
  const sessions = useJamExternalSessions();
  const [dismissed, setDismissed] = useState(false);

  // Dismissal is session-scoped: once acknowledged, it stays out of the way
  // for the duration of the visit, and a new batch of sessions does not
  // re-surface it.
  if (sessions <= 0 || dismissed) return null;

  // NativeWind v4 can't apply `/N` opacity to CSS-variable colors (e.g.
  // `bg-surface-2/90`), so the banner background uses an inline rgba style.
  return (
    <View
      style={background('surface-2', 0.9)}
      className="flex-row items-center gap-2 rounded-lg border border-border px-4 py-2"
    >
      <EyeOnIcon size={16} className="text-foreground" />
      <ThemedText className="flex-1 text-sm text-foreground">
        {t('jams.observers.connected', { count: sessions })}
      </ThemedText>
      <Pressable
        accessibilityLabel={t('jams.observers.dismiss')}
        accessibilityRole="button"
        className="size-10 shrink-0 items-center justify-center"
        onPress={() => setDismissed(true)}
      >
        <XIcon size={16} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
};

/**
 * Dismissable banner shown when the local connection quality degrades.
 * Rendered inside `JamsBannerStack` so it stacks with the other jam banners
 * instead of positioning itself.
 */
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
      className="flex-row items-center gap-3 rounded-lg px-4 py-2"
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
        accessibilityRole="button"
        className="size-10 shrink-0 items-center justify-center"
        onPress={() => setDismissed(true)}
      >
        <XIcon size={16} className="text-accent-foreground" />
      </Pressable>
    </View>
  );
};
