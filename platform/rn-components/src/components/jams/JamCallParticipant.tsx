import React from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import {
  isTrackReference,
  type TrackReferenceOrPlaceholder,
  useIsSpeaking,
  useRoomContext,
  VideoTrack,
} from '@livekit/react-native';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import {
  parseParticipantMetadata,
  useCurrentProfile,
  useJamContext,
  useJamEventsContext,
  useJamParticipantMute,
  useRaisedHands,
} from '@openpeepshq/react';
import {
  AudioLinesIcon,
  EllipsisIcon,
  HandIcon,
  MicIcon,
  MicOffIcon,
  PinIcon,
  WifiOffIcon,
} from '~/components/icons';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '~/components/ui/dropdown-menu';
import { ThemedText } from '~/components/ui/themed-text';
import { Button } from '~/components/ui/button';
import { cn } from '~/lib/utils';
import { ProfileAvatar } from '../profile/Avatar';
import { JamAnimatedEmoji } from './JamAnimatedEmoji';
import { useConnectionLost } from './useParticipantConnection';

export interface JamCallParticipantProps {
  /** Camera track reference (or placeholder when the camera is off). */
  trackRef: TrackReferenceOrPlaceholder;
  /** Tailwind size classes for the tile (e.g. `size-full`, `size-40`). */
  size: string;
  compact?: boolean;
  /** Enlarge this camera. Only offered while the camera is publishing. */
  onEnlarge?: () => void;
  /** Host spotlight currently points at this participant. */
  spotlighted?: boolean;
  /** Host-only toggle for the room-wide spotlight. */
  onToggleSpotlight?: () => void;
}

const JamParticipantReactions = ({
  identity,
  isLocal,
}: {
  identity: string;
  isLocal: boolean;
}) => {
  const { ownReactions, reactionsForParticipant } = useJamEventsContext();
  const reactions = isLocal ? ownReactions : reactionsForParticipant(identity);
  return (
    <>
      {reactions.map((reaction) => (
        <JamAnimatedEmoji key={reaction.id} emoji={reaction.content ?? ''} />
      ))}
    </>
  );
};

const JamSpotlightMenuItem = ({
  spotlighted,
  onToggleSpotlight,
}: {
  spotlighted: boolean;
  onToggleSpotlight: () => void;
}) => {
  const { t } = useTranslation();
  return (
    <DropdownMenuItem
      className="flex-row items-center gap-x-2"
      onPress={onToggleSpotlight}
    >
      <PinIcon size={16} className="text-foreground" />
      <ThemedText>
        {spotlighted
          ? t('jams.speakerView.removeSpotlight')
          : t('jams.speakerView.spotlight')}
      </ThemedText>
    </DropdownMenuItem>
  );
};

/**
 * Menu on a remote tile: moderators can mute, and whoever may spotlight
 * (creator or moderator) can toggle the room-wide spotlight.
 */
const JamParticipantMenu = ({
  trackRef,
  canMute,
  spotlighted,
  onToggleSpotlight,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  canMute: boolean;
  spotlighted: boolean;
  onToggleSpotlight?: () => void;
}) => {
  const { t } = useTranslation();
  const handleMute = useJamParticipantMute({
    participant: trackRef.participant,
    onSuccess: (text1) => Toast.show({ type: 'success', text1 }),
    onError: (text1) => Toast.show({ type: 'error', text1 }),
  });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="size-8 rounded-full bg-card"
          accessibilityLabel={t('jams.participants.title')}
        >
          <EllipsisIcon size={16} className="text-foreground" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start">
        <DropdownMenuGroup>
          {canMute ? (
            <DropdownMenuItem
              className="flex-row items-center gap-x-2"
              onPress={() => void handleMute()}
            >
              <MicOffIcon size={16} className="text-foreground" />
              <ThemedText>{t('jams.participants.muteParticipant')}</ThemedText>
            </DropdownMenuItem>
          ) : null}
          {onToggleSpotlight ? (
            <JamSpotlightMenuItem
              spotlighted={spotlighted}
              onToggleSpotlight={onToggleSpotlight}
            />
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

/** Raised hand + mic state on top, name (with moderator `*` prefix) at the bottom. */
const JamParticipantOverlay = ({
  trackRef,
  compact,
  spotlighted,
  onToggleSpotlight,
}: {
  trackRef: TrackReferenceOrPlaceholder;
  compact: boolean;
  spotlighted: boolean;
  onToggleSpotlight?: () => void;
}) => {
  const { t } = useTranslation();
  const participant = trackRef.participant;
  const room = useRoomContext();
  const me = useCurrentProfile();
  const { jam } = useJamContext();
  const raisedHands = useRaisedHands(room);
  const speaking = useIsSpeaking(participant);
  const connectionLost = useConnectionLost(participant);

  const micOn = participant.isMicrophoneEnabled;
  const handUp = raisedHands.has(participant.identity);
  const profile = parseParticipantMetadata(participant.metadata).profile;
  const isModerator = jam.moderators.includes(participant.identity);
  const viewerIsModerator = !!me && jam.moderators.includes(me.id);
  const iconSize = compact ? 12 : 16;
  const micIconClass =
    micOn && speaking && !connectionLost ? 'text-primary' : 'text-foreground';

  return (
    <View
      pointerEvents="box-none"
      className={cn(
        'absolute inset-0 justify-between',
        compact ? 'p-1' : 'p-2'
      )}
    >
      <View className="w-full flex-row items-start justify-between">
        <View className="flex-row items-center gap-1">
          {handUp ? (
            <View className="rounded-full bg-background/70 p-2">
              <HandIcon size={iconSize} className="text-foreground" />
            </View>
          ) : null}
          {(viewerIsModerator || onToggleSpotlight) && !participant.isLocal ? (
            <JamParticipantMenu
              trackRef={trackRef}
              canMute={viewerIsModerator}
              spotlighted={spotlighted}
              onToggleSpotlight={onToggleSpotlight}
            />
          ) : null}
        </View>
        <View className="rounded-full bg-card p-2">
          {connectionLost ? (
            <WifiOffIcon size={iconSize} className={micIconClass} />
          ) : !micOn ? (
            <MicOffIcon size={iconSize} className={micIconClass} />
          ) : speaking ? (
            <AudioLinesIcon size={iconSize} className={micIconClass} />
          ) : (
            <MicIcon size={iconSize} className={micIconClass} />
          )}
        </View>
      </View>
      <View className="w-full flex-row items-end justify-between">
        <View className="max-w-full rounded-lg bg-card p-1">
          <ThemedText
            numberOfLines={1}
            className={compact ? 'text-xs' : 'text-sm'}
          >
            {profile
              ? (isModerator ? '* ' : '') +
                (profile.displayName || `@${profile.handle}`)
              : ''}
          </ThemedText>
        </View>
        {connectionLost ? (
          <View className="ml-1 shrink-0 rounded-lg bg-card p-1">
            <ThemedText
              numberOfLines={1}
              className={cn(
                'text-muted-foreground',
                compact ? 'text-xs' : 'text-sm'
              )}
            >
              {t('jams.people.connectionLost')}
            </ThemedText>
          </View>
        ) : null}
      </View>
    </View>
  );
};

/**
 * Single participant tile: the camera video (or an avatar fallback when the
 * camera is off/muted), the participant overlay and any active reactions.
 */
export const JamCallParticipant = ({
  trackRef,
  size,
  compact = false,
  onEnlarge,
  spotlighted = false,
  onToggleSpotlight,
}: JamCallParticipantProps) => {
  const { t } = useTranslation();
  const participant = trackRef.participant;
  const profile = parseParticipantMetadata(participant.metadata).profile;
  const connectionLost = useConnectionLost(participant);
  const speaking = useIsSpeaking(participant);
  const cameraOn = isTrackReference(trackRef) && !trackRef.publication.isMuted;
  const displayName =
    profile?.displayName || (profile?.handle ? `@${profile.handle}` : '');

  return (
    <View
      className={cn(
        size,
        'relative rounded-xl border border-border bg-background',
        // No `ring-*` on native: the speaking highlight is a primary border.
        speaking && 'border-2 border-primary'
      )}
    >
      <View
        className={cn(
          'size-full overflow-hidden rounded-xl',
          connectionLost && 'opacity-40'
        )}
      >
        {cameraOn ? (
          <VideoTrack
            trackRef={trackRef}
            style={StyleSheet.absoluteFill}
            objectFit="cover"
            mirror={participant.isLocal}
          />
        ) : (
          <View className="size-full items-center justify-center">
            {profile ? (
              <ProfileAvatar profile={profile} className="size-20" />
            ) : null}
          </View>
        )}
      </View>
      {onEnlarge && cameraOn ? (
        <Pressable
          className="absolute inset-0 rounded-xl"
          accessibilityRole="button"
          accessibilityLabel={t('jams.speakerView.enlarge', {
            name: displayName,
          })}
          onPress={onEnlarge}
        />
      ) : null}
      <JamParticipantOverlay
        trackRef={trackRef}
        compact={compact}
        spotlighted={spotlighted}
        onToggleSpotlight={onToggleSpotlight}
      />
      <JamParticipantReactions
        identity={participant.identity}
        isLocal={participant.isLocal}
      />
    </View>
  );
};
