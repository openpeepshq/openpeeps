import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { truncateText } from '@openpeepshq/common';
import { useJamContext } from '@openpeepshq/react';
import {
  CircleStopIcon,
  DiscIcon,
  HandIcon,
  InfoIcon,
  LaughIcon,
  MessageSquareTextIcon,
  UsersRoundIcon,
} from '../icons/index';
import {
  JamAudioOutputSelector,
  JamCameraSelector,
  JamMicSelector,
} from './JamDeviceSelectors';
import { JamReactionMenu } from './JamReactionMenu';
import { JamToolbarButton, toneIconClass } from './JamToolbarButton';
import { LeaveCloseButton } from './LeaveCloseButton';
import { type JamFooterProps } from './JamFooter';
import { useFooterControls } from './JamFooter';
import { ThemedText } from '../ui/themed-text';

export type JamDesktopFooterProps = JamFooterProps;

/**
 * Wide-screen (tablet/desktop) in-room toolbar, mirroring the web JamFooter
 * `md:flex` DesktopFooter (platform/react/src/components/jams/JamFooter.tsx).
 * Rendered by JamParticipantConference in place of the mobile JamFooter when
 * isMediumScreenOrLarger. Screen sharing and background blur are web-only (no
 * React Native equivalents), so they are intentionally omitted.
 */
export const JamDesktopFooter = ({
  chatOpen,
  onToggleChat,
  peopleOpen,
  onTogglePeople,
  detailsOpen,
  onToggleDetails,
  speakerDeviceId,
  speakerEnabled,
  onSpeakerChange,
  onToggleSpeaker,
}: JamDesktopFooterProps) => {
  const { t } = useTranslation();
  const { jamEvent } = useJamContext();
  const {
    isModerator,
    isRecording,
    recordingLabel,
    recordingEnabled,
    handRaised,
    busy,
    participantCount,
    waitingRoomCount,
    sendReactionEmoji,
    toggleRecording,
    raiseHand,
  } = useFooterControls();
  const [reactionMenuOpen, setReactionMenuOpen] = useState(false);

  return (
    <View className="w-full flex-none flex-row items-center justify-between bg-background/75 px-4 py-3">
      <ThemedText className="truncate pr-2">
        {truncateText(jamEvent.name, 40)}
      </ThemedText>

      <View className="relative flex-row items-center gap-x-4">
        {reactionMenuOpen ? (
          <View className="absolute bottom-12 right-0 z-50">
            <JamReactionMenu
              onSelect={(emoji) => void sendReactionEmoji(emoji)}
            />
          </View>
        ) : null}

        <JamMicSelector />
        <JamCameraSelector />
        <JamAudioOutputSelector
          speakerDeviceId={speakerDeviceId}
          speakerEnabled={speakerEnabled}
          onSpeakerChange={onSpeakerChange}
          onToggleSpeaker={onToggleSpeaker}
        />

        {isModerator && recordingEnabled ? (
          <JamToolbarButton
            tone="danger"
            disabled={busy}
            title={recordingLabel}
            action={() => void toggleRecording()}
          >
            {isRecording ? (
              <CircleStopIcon
                size={20}
                className="text-destructive-foreground"
              />
            ) : (
              <DiscIcon size={20} className="text-destructive-foreground" />
            )}
          </JamToolbarButton>
        ) : null}

        <JamToolbarButton
          title={t('jams.hand.raiseTitle')}
          tone={handRaised ? 'active' : 'default'}
          action={() => void raiseHand()}
        >
          <HandIcon
            size={20}
            className={toneIconClass[handRaised ? 'active' : 'default']}
          />
        </JamToolbarButton>

        <JamToolbarButton
          title={t('jams.reactions.sendTitle')}
          tone={reactionMenuOpen ? 'active' : 'default'}
          action={() => setReactionMenuOpen((open) => !open)}
        >
          <LaughIcon
            size={20}
            className={toneIconClass[reactionMenuOpen ? 'active' : 'default']}
          />
        </JamToolbarButton>

        <JamToolbarButton
          title={t('jams.chat.openEveryoneTitle')}
          tone={chatOpen ? 'active' : 'default'}
          action={onToggleChat}
        >
          <MessageSquareTextIcon
            size={20}
            className={toneIconClass[chatOpen ? 'active' : 'default']}
          />
        </JamToolbarButton>
      </View>

      <View className="relative flex-row items-center gap-x-4">
        <JamToolbarButton
          title={t('jams.mobileMenu.jamDetails')}
          tone={detailsOpen ? 'active' : 'default'}
          action={onToggleDetails}
        >
          <InfoIcon
            size={20}
            className={toneIconClass[detailsOpen ? 'active' : 'default']}
          />
        </JamToolbarButton>

        <JamToolbarButton
          title={t('jams.participant.showEveryone')}
          tone={peopleOpen ? 'active' : 'default'}
          action={onTogglePeople}
        >
          <View className="relative">
            <UsersRoundIcon
              size={20}
              className={toneIconClass[peopleOpen ? 'active' : 'default']}
            />
            {participantCount > 0 || waitingRoomCount > 0 ? (
              <View className="bg-border-2 absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full px-1 py-0.5">
                <ThemedText className="text-xs text-foreground">
                  {participantCount}
                </ThemedText>
                {waitingRoomCount > 0 ? (
                  <ThemedText className="text-destructive">
                    {' +' + waitingRoomCount}
                  </ThemedText>
                ) : null}
              </View>
            ) : null}
          </View>
        </JamToolbarButton>

        <LeaveCloseButton />
      </View>
    </View>
  );
};
