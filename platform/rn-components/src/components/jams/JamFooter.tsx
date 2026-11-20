import React, { useCallback, useMemo, useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useParticipants, useRoomContext } from '@livekit/react-native';
import Toast, {
  type ToastConfig,
  type ToastConfigParams,
} from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useJamFooterControls } from '@openpeepshq/react';
import {
  CircleEllipsisIcon,
  CircleStopIcon,
  DiscIcon,
  HandIcon,
  InfoIcon,
  LaughIcon,
  MessageSquareTextIcon,
  UsersRoundIcon,
} from '../icons/index';
import { ThemedText } from '../ui/themed-text';
import { useOpenPeepsTheme } from '../../theme/OpenPeepsThemeProvider';
import {
  JamAudioOutputSelector,
  JamCameraSelector,
  JamMicSelector,
  type JamIconType,
} from './JamDeviceSelectors';
import { JamReactionMenu } from './JamReactionMenu';
import { JamToolbarButton, toneIconClass } from './JamToolbarButton';
import { LeaveCloseButton } from './LeaveCloseButton';
import { useThemeOpacity } from '../../theme/useThemeOpacity';

/** Themed toast body; the library default colors sit off the app palette. */
const TOAST_BODY = {
  borderWidth: 1,
  borderRadius: 8,
  paddingHorizontal: 16,
  paddingVertical: 10,
  maxWidth: '90%' as const,
};

const ThemedToast = ({
  text1,
  bg,
  fg,
}: {
  text1?: string;
  bg: string;
  fg: string;
}) => (
  <View style={[TOAST_BODY, { backgroundColor: bg, borderColor: fg }]}>
    <ThemedText style={{ color: fg }} className="text-sm font-medium">
      {text1}
    </ThemedText>
  </View>
);

/** Toast layouts mapped to theme tokens (success, error/destructive, info/primary). */
export const useThemedToastConfig = (): ToastConfig => {
  const { colors } = useOpenPeepsTheme();
  return useMemo(
    () => ({
      success: ({ text1 }: ToastConfigParams<Record<string, never>>) => (
        <ThemedToast
          text1={text1}
          bg={colors.primary}
          fg={colors['primary-foreground']}
        />
      ),
      error: ({ text1 }: ToastConfigParams<Record<string, never>>) => (
        <ThemedToast
          text1={text1}
          bg={colors.destructive}
          fg={colors['destructive-foreground']}
        />
      ),
      info: ({ text1 }: ToastConfigParams<Record<string, never>>) => (
        <ThemedToast text1={text1} bg={colors.card} fg={colors.foreground} />
      ),
    }),
    [colors]
  );
};

export interface JamFooterProps {
  chatOpen: boolean;
  onToggleChat: () => void;
  peopleOpen: boolean;
  onTogglePeople: () => void;
  detailsOpen: boolean;
  onToggleDetails: () => void;
  speakerDeviceId?: string;
  speakerEnabled: boolean;
  onSpeakerChange: (deviceId: string) => void;
  onToggleSpeaker: () => void;
}

/** Native wrapper: `Alert` confirm + toasts. */
export const useFooterControls = () => {
  const { t } = useTranslation();
  const room = useRoomContext();
  const participants = useParticipants();

  // Stable identity: the footer controls hook lists showToast in an effect
  // deps array, and an inline lambda would tear that effect down every render.
  // Waiting-room joins are neutral info on native.
  const showToast = useCallback((text1: string) => {
    Toast.show({ type: 'info', text1 });
  }, []);

  const confirmStopRecording = () =>
    new Promise<boolean>((resolve) => {
      Alert.alert('', t('jams.recording.stopConfirm'), [
        {
          text: t('common.actions.cancel'),
          style: 'cancel',
          onPress: () => resolve(false),
        },
        {
          text: t('jams.recording.stopTitle'),
          style: 'destructive',
          onPress: () => resolve(true),
        },
      ]);
    });

  return useJamFooterControls({
    room,
    participantCount: participants.length,
    confirmStopRecording,
    onSuccess: (text1) => Toast.show({ type: 'success', text1 }),
    onError: (text1) => Toast.show({ type: 'error', text1 }),
    showToast,
  });
};

const MenuEntry = ({
  icon: Icon,
  label,
  disabled,
  onPress,
}: {
  icon: JamIconType;
  label: string;
  disabled?: boolean;
  onPress: () => void;
}) => (
  <Pressable
    disabled={disabled}
    onPress={onPress}
    className="w-1/3 items-center justify-center gap-y-2 p-2"
  >
    <Icon size={24} className="text-foreground" />
    <ThemedText className="text-center">{label}</ThemedText>
  </Pressable>
);

/** Overflow menu: chat, details, hand, people and (moderators) record. */
const MobileMenu = ({
  isModerator,
  recordingEnabled,
  isRecording,
  recordingLabel,
  busy,
  onClose,
  onOpenChat,
  onOpenPeople,
  onOpenDetails,
  onRaiseHand,
  onToggleRecording,
}: {
  isModerator: boolean;
  recordingEnabled: boolean;
  isRecording: boolean;
  recordingLabel: string;
  busy: boolean;
  onClose: () => void;
  onOpenChat: () => void;
  onOpenPeople: () => void;
  onOpenDetails: () => void;
  onRaiseHand: () => void;
  onToggleRecording: () => void;
}) => {
  const { t } = useTranslation();
  const run = (action: () => void) => () => {
    onClose();
    action();
  };

  return (
    <View className="absolute bottom-20 left-2 right-2 z-50 flex-row flex-wrap rounded-md bg-card p-2">
      <MenuEntry
        icon={MessageSquareTextIcon}
        label={t('jams.mobileMenu.inJamMessage')}
        onPress={run(onOpenChat)}
      />
      <MenuEntry
        icon={InfoIcon}
        label={t('jams.mobileMenu.jamDetails')}
        onPress={run(onOpenDetails)}
      />
      <MenuEntry
        icon={HandIcon}
        label={t('jams.hand.raiseLabel')}
        onPress={run(onRaiseHand)}
      />
      <MenuEntry
        icon={UsersRoundIcon}
        label={t('jams.mobileMenu.people')}
        onPress={run(onOpenPeople)}
      />
      {isModerator && recordingEnabled ? (
        <MenuEntry
          icon={isRecording ? CircleStopIcon : DiscIcon}
          label={recordingLabel}
          disabled={busy}
          onPress={run(onToggleRecording)}
        />
      ) : null}
    </View>
  );
};

/**
 * In-room footer. Mirrors the web mobile toolbar: mic · camera · speaker ·
 * reactions · overflow menu · leave. Screen sharing is not available on
 * React Native, so the overflow menu has no share entry.
 */
export const JamFooter = ({
  onToggleChat,
  onTogglePeople,
  onToggleDetails,
  speakerDeviceId,
  speakerEnabled,
  onSpeakerChange,
  onToggleSpeaker,
}: JamFooterProps) => {
  const { t } = useTranslation();
  const { background } = useThemeOpacity();
  const {
    isModerator,
    isRecording,
    recordingLabel,
    recordingEnabled,
    busy,
    sendReactionEmoji,
    toggleRecording,
    raiseHand,
  } = useFooterControls();

  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const reactionTone = reactionMenuOpen ? 'active' : 'default';

  return (
    <View
      style={background('background', 0.75)}
      className="relative w-full flex-row items-center justify-between gap-x-2 px-2 py-3"
    >
      {reactionMenuOpen ? (
        <View className="absolute bottom-20 left-[5%] right-[5%] z-50 rounded-md p-2">
          <JamReactionMenu
            onSelect={(emoji) => void sendReactionEmoji(emoji)}
          />
        </View>
      ) : null}
      {mobileMenuOpen ? (
        <MobileMenu
          isModerator={isModerator}
          recordingEnabled={recordingEnabled}
          isRecording={isRecording}
          recordingLabel={recordingLabel}
          busy={busy}
          onClose={() => setMobileMenuOpen(false)}
          onOpenChat={onToggleChat}
          onOpenPeople={onTogglePeople}
          onOpenDetails={onToggleDetails}
          onRaiseHand={raiseHand}
          onToggleRecording={() => void toggleRecording()}
        />
      ) : null}

      <View className="flex min-w-0 flex-1 flex-row items-center gap-x-2 overflow-hidden">
        <JamMicSelector />
        <JamCameraSelector />
        <JamAudioOutputSelector
          speakerDeviceId={speakerDeviceId}
          speakerEnabled={speakerEnabled}
          onSpeakerChange={onSpeakerChange}
          onToggleSpeaker={onToggleSpeaker}
        />
      </View>

      <View className="flex shrink-0 flex-row items-center gap-x-2">
        <JamToolbarButton
          title={t('jams.reactions.sendTitle')}
          tone={reactionTone}
          action={() => setReactionMenuOpen((open) => !open)}
        >
          <LaughIcon size={20} className={toneIconClass[reactionTone]} />
        </JamToolbarButton>

        <JamToolbarButton
          title={t('jams.drawer.jamControls')}
          action={() => setMobileMenuOpen((open) => !open)}
        >
          <CircleEllipsisIcon size={20} className="text-foreground" />
        </JamToolbarButton>

        <LeaveCloseButton />
      </View>
    </View>
  );
};
