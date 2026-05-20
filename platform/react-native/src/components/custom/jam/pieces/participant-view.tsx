import * as React from 'react';
import { ViewStyle } from 'react-native';
import {
  isTrackReference,
  TrackReferenceOrPlaceholder,
  useEnsureTrackRef,
  useIsMuted,
  useIsSpeaking,
  useParticipantInfo,
  useRoomContext,
  VideoTrack,
} from '@livekit/react-native';
import { View } from 'react-native';
import { ThemedText } from '~/components/ui/themed-text';
import { ProfileData } from '@openpeeps/common';
import { Avatar, AvatarImage } from '~/components/ui/avatar';
import {
  AudioLinesIcon,
  HandIcon,
  MicOffIcon,
  MoreVerticalIcon,
} from '~/components/icons';
import { cn } from '~/lib/utils';
import { ThemedView } from '~/components/ui/themed-view';
import { useJamStore } from '~/stores/useJamStore';
import { MetadataType } from '~/types';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { JamParticipantActionSheet } from '../../modals';
import { Button } from '~/components/ui/button';
import { OwnReactions } from './own-reactions';
import { RemoteReactions } from './remote-reactions';
import { useOpenpeeps } from '@openpeeps/react';

interface ParticipantViewProps {
  trackRef: TrackReferenceOrPlaceholder;
  style?: ViewStyle;
  zOrder?: number;
  fullScreen?: boolean;
}

const VideoView: React.FC<{
  trackRef: TrackReferenceOrPlaceholder;
  fullScreen: boolean;
}> = React.memo(({ trackRef, fullScreen }) => {
  return (
    <View
      className={cn(
        'relative overflow-hidden rounded-md',
        fullScreen ? 'h-full w-full' : 'm-1 h-56 w-[175px]',
      )}>
      <VideoTrack
        style={{
          width: '100%',
          height: '100%',
        }}
        objectFit="cover"
        trackRef={isTrackReference(trackRef) ? trackRef : undefined}
        mirror={true}
        key={trackRef.participant.identity}
      />
    </View>
  );
});

const AvatarView: React.FC<{
  profile?: ProfileData;
  fullScreen: boolean;
}> = React.memo(({ profile, fullScreen }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { data: server } = openpeepsApi.useServerInfo();

  return (
    <View
      className={cn(
        'relative flex items-center justify-center rounded-md',
        fullScreen ? 'h-full w-full bg-secondary/50' : 'm-1 h-56 w-[175px] bg-background',
      )}>
      <Avatar alt="profile" className="h-16 w-16">
        {profile?.avatar ? (
          <AvatarImage source={{ uri: profile.avatar }} />
        ) : (
          <AvatarImage
            source={{
              uri: server?.communityConfig.theme.defaultProfileAvatar,
            }}
          />
        )}
      </Avatar>
    </View>
  );
});

const MicrophoneIndicator: React.FC<{
  isMicEnabled: boolean;
  isSpeaking: boolean;
}> = React.memo(({ isMicEnabled, isSpeaking }) => {
  if (!isMicEnabled) {
    return (
      <View className="absolute top-4 right-2 p-2 bg-black/50 rounded-full">
        <MicOffIcon size={20} className="text-foreground" />
      </View>
    );
  }

  if (isSpeaking) {
    return (
      <View className="absolute p-2 top-4 right-2 bg-black/50 rounded-full">
        <AudioLinesIcon size={20} className="text-foreground" />
      </View>
    );
  }

  return null;
});

const ParticipantInfo: React.FC<{
  profile?: ProfileData;
  isHandRaised: boolean;
  participantRole?: string;
}> = React.memo(({ profile, isHandRaised, participantRole }) => (
  <View className="flex-row items-center gap-x-2">
    {isHandRaised && (
      <View className="p-1 bg-black/50 rounded-full">
        <HandIcon className="text-foreground" />
      </View>
    )}
    <ThemedText className="max-w-20 truncate h-6">
      {profile?.displayName || `@${profile?.handle}`}
    </ThemedText>
    {participantRole && (
      <ThemedView className="px-1 rounded-md">
        <ThemedText>{participantRole}</ThemedText>
      </ThemedView>
    )}
  </View>
));

export const ParticipantView: React.FC<ParticipantViewProps> = ({
  trackRef,
  fullScreen = false,
}) => {
  const trackReference = useEnsureTrackRef(trackRef);
  const { metadata } = useParticipantInfo({
    participant: trackReference.participant,
  });
  const participant = trackReference.participant;
  const [profile, setProfile] = React.useState<ProfileData>();
  const [participantRole, setParticipantRole] = React.useState<string>();
  const [isHandRaised, setIsHandRaised] = React.useState(false);
  const isSpeaking = useIsSpeaking(trackReference.participant);
  const isVideoMuted = useIsMuted(trackReference);
  const { jam, jamPost } = useJamStore();
  const room = useRoomContext();
  const participantActionSheetRef = React.useRef<BottomSheetModal>(null);

  const handleParticipantActionModalPress = React.useCallback(() => {
    participantActionSheetRef.current?.present();
  }, []);

  React.useEffect(() => {
    try {
      const parsedMetadata: MetadataType = JSON.parse(metadata || '{}');
      setProfile(parsedMetadata.profile);
      setIsHandRaised(Boolean(parsedMetadata.handRaised));

      if (jamPost?.profile.id === parsedMetadata.profile?.id) {
        setParticipantRole('H');
      } else if (jam?.moderators.includes(parsedMetadata.profile?.id || '')) {
        setParticipantRole('M');
      } else {
        setParticipantRole(undefined);
      }
    } catch (error) {
      console.error('Failed to parse metadata:', error);
    }
  }, [metadata, jam, jamPost?.profile.id]);

  const isModerator = React.useMemo(
    () => jam?.moderators.includes(room.localParticipant.identity),
    [jam?.moderators, room.localParticipant.identity],
  );

  return (
    <>
      <View className={cn('relative', fullScreen && 'w-full h-full')}>
        {isTrackReference(trackReference) && !isVideoMuted ? (
          <VideoView trackRef={trackReference} fullScreen={fullScreen} />
        ) : (
          <AvatarView profile={profile} fullScreen={fullScreen} />
        )}

        <MicrophoneIndicator
          isMicEnabled={trackReference.participant.isMicrophoneEnabled}
          isSpeaking={isSpeaking}
        />

        <View
          className={cn(
            'absolute bottom-0 flex-row items-center justify-between p-4 w-full',
            fullScreen && 'pr-2',
          )}>
          <ParticipantInfo
            profile={profile}
            isHandRaised={isHandRaised}
            participantRole={participantRole}
          />

          {isModerator && (
            <Button
              variant="ghost"
              onPress={handleParticipantActionModalPress}
              className="p-2 pr-0 w-4">
              <MoreVerticalIcon className="text-foreground" />
            </Button>
          )}
        </View>

        {participant.isLocal ? (
          <OwnReactions />
        ) : (
          <RemoteReactions participantId={participant.identity} />
        )}
      </View>

      <JamParticipantActionSheet
        participantMetdata={JSON.parse(metadata || '{}') as MetadataType}
        participant={participant}
        ref={participantActionSheetRef}
      />
    </>
  );
};
