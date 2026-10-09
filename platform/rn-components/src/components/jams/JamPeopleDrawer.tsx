import React from 'react';
import { ScrollView, View } from 'react-native';
import { useParticipants, useRoomContext } from '@livekit/react-native';
import type { Participant } from 'livekit-client';
import { useTranslation } from 'react-i18next';
import { profileName } from '@openpeepshq/common/lib';
import { parseParticipantMetadata, useJamPeople } from '@openpeepshq/react';
import {
  AudioLinesIcon,
  HandIcon,
  MicIcon,
  MicOffIcon,
  SearchIcon,
  UserRoundCheckIcon,
  WifiOffIcon,
} from '../icons/index';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { ThemedText } from '../ui/themed-text';
import { cn } from '../../lib/utils';
import { ProfileAvatar } from '../profile/Avatar';
import { JamDrawer } from './JamDrawer';
import { useConnectionLost } from './useParticipantConnection';

export interface JamPeopleDrawerProps {
  open: boolean;
  onClose: () => void;
}

const SectionHeading = ({ children }: { children: string }) => (
  <ThemedText className="text-xs font-semibold uppercase text-muted-foreground">
    {children}
  </ThemedText>
);

/** One "In jam" row. Split out so the connection-quality hook runs per participant. */
const JamParticipantRow = ({
  participant,
  handUp,
  isModerator,
}: {
  participant: Participant;
  handUp: boolean;
  isModerator: boolean;
}) => {
  const { t } = useTranslation();
  const profile = parseParticipantMetadata(participant.metadata).profile;
  const micOn = participant.isMicrophoneEnabled;
  const speaking = participant.isSpeaking;
  const connectionLost = useConnectionLost(participant);

  return (
    <View className="flex-row items-center justify-between gap-2">
      <View
        className={cn(
          'min-w-0 flex-1 flex-row items-center gap-2',
          connectionLost && 'opacity-50'
        )}
      >
        {profile ? (
          <ProfileAvatar profile={profile} className="size-8" />
        ) : null}
        <ThemedText numberOfLines={1} className="shrink text-sm">
          {(isModerator ? '* ' : '') +
            (profile ? profileName(profile) : participant.identity)}
        </ThemedText>
      </View>
      <View className="flex-row items-center gap-1.5">
        {handUp ? <HandIcon size={16} className="text-foreground" /> : null}
        {connectionLost ? (
          <WifiOffIcon
            size={16}
            className="text-muted-foreground"
            accessibilityLabel={t('jams.people.connectionLost')}
          />
        ) : !micOn ? (
          <MicOffIcon size={16} className="text-muted-foreground" />
        ) : speaking ? (
          <AudioLinesIcon size={16} className="text-primary" />
        ) : (
          <MicIcon size={16} className="text-foreground" />
        )}
      </View>
    </View>
  );
};

/**
 * In-room participants list with mic / raised-hand / moderator indicators,
 * plus a moderator-only waiting-room admit section.
 */
export const JamPeopleDrawer = ({ open, onClose }: JamPeopleDrawerProps) => {
  const { t } = useTranslation();
  const room = useRoomContext();
  const participants = useParticipants();
  const {
    isModerator,
    hasWaitingRoom,
    moderatorIds,
    raisedHands,
    query,
    setQuery,
    listedParticipants,
    waitingProfiles,
    admittingId,
    admit,
  } = useJamPeople({ room, participants });

  if (!open) return null;

  return (
    <JamDrawer title={t('jams.drawer.peopleTitle')} onClose={onClose}>
      <View className="px-2">
        <View className="relative justify-center">
          <SearchIcon
            size={16}
            className="absolute left-3 z-10 text-muted-foreground"
          />
          <Input
            className="pl-9"
            value={query}
            onChangeText={setQuery}
            placeholder={t('jams.drawer.searchPeoplePlaceholder')}
          />
        </View>
      </View>

      <ScrollView
        className="flex-1"
        contentContainerClassName="gap-4 px-2 pb-4"
      >
        <View>
          <SectionHeading>{t('jams.people.inJam')}</SectionHeading>
          <View className="mt-1 gap-2">
            {listedParticipants.map((participant) => (
              <JamParticipantRow
                key={participant.identity}
                participant={participant}
                handUp={raisedHands.has(participant.identity)}
                isModerator={moderatorIds.includes(participant.identity)}
              />
            ))}
            {listedParticipants.length === 0 ? (
              <ThemedText className="py-4 text-center text-sm text-muted-foreground">
                {t('jams.people.noParticipants')}
              </ThemedText>
            ) : null}
          </View>
        </View>

        {isModerator && hasWaitingRoom && waitingProfiles.length > 0 ? (
          <View>
            <SectionHeading>{t('jams.people.inWaitingRoom')}</SectionHeading>
            <View className="mt-1 gap-2">
              {waitingProfiles.map((profile) => (
                <View
                  key={profile.id}
                  className="flex-row items-center justify-between gap-2"
                >
                  <View className="min-w-0 flex-1 flex-row items-center gap-2">
                    <ProfileAvatar profile={profile} className="size-8" />
                    <ThemedText numberOfLines={1} className="shrink text-sm">
                      {profileName(profile)}
                    </ThemedText>
                  </View>
                  <Button
                    variant="outline"
                    size="icon"
                    onPress={() => admit(profile)}
                    disabled={admittingId === profile.id}
                    accessibilityLabel={t('jams.waitingRoom.admitParticipant')}
                  >
                    <UserRoundCheckIcon size={16} className="text-foreground" />
                  </Button>
                </View>
              ))}
            </View>
          </View>
        ) : null}
      </ScrollView>
    </JamDrawer>
  );
};
