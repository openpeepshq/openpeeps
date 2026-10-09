import React, { useState } from 'react';
import { Alert, Pressable, View } from 'react-native';
import { useParticipants, useRoomContext } from '@livekit/react-native';
import Toast from 'react-native-toast-message';
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
import {
  JamAudioOutputSelector,
  JamCameraSelector,
  JamMicSelector,
  type JamIconType,
} from './JamDeviceSelectors';
import { JamReactionMenu } from './JamReactionMenu';
import { JamToolbarButton, toneIconClass } from './JamToolbarButton';
import { LeaveCloseButton } from './LeaveCloseButton';

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
const useFooterControls = () => {
  const { t } = useTranslation();
  const room = useRoomContext();
  const participants = useParticipants();

  const confirmStopRecording = () =>
    new Promise<boolean>((resolve) => {
      Alert.alert('', t('jams.recording.stopConfirm'), [
        {
          text: t('common.cancel'),
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
          label={
            isRecording
              ? t('jams.recording.stopTitle')
              : t('events.recordingInProgress')
          }
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
  const {
    isModerator,
    isRecording,
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
    <View className="relative w-full flex-row items-center justify-between gap-x-2 bg-background/75 px-2 py-3">
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
          busy={busy}
          onClose={() => setMobileMenuOpen(false)}
          onOpenChat={onToggleChat}
          onOpenPeople={onTogglePeople}
          onOpenDetails={onToggleDetails}
          onRaiseHand={raiseHand}
          onToggleRecording={() => void toggleRecording()}
        />
      ) : null}

      <JamMicSelector />
      <JamCameraSelector />
      <JamAudioOutputSelector
        speakerDeviceId={speakerDeviceId}
        speakerEnabled={speakerEnabled}
        onSpeakerChange={onSpeakerChange}
        onToggleSpeaker={onToggleSpeaker}
      />

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
  );
};
