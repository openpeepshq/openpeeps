import React, { useRef, useState, type ComponentType } from 'react';
import { ScreenCapturePickerView } from '@livekit/react-native-webrtc';
import type { TrackReferenceOrPlaceholder } from '@livekit/react-native';
import {
  useParticipants,
  useTracks,
  useVisualStableUpdate,
} from '@livekit/react-native';
import { Participant, Track } from 'livekit-client';
import { JamRoomMenu, JamHeader } from '../..';
import { Platform, View } from 'react-native';
import { JamFooter } from './jam-footer';
import { ScreenSharing } from './modes/screen-sharing';
import { Alone } from './modes/alone';
import { OneOnOne } from './modes/one-on-one';
import { Default } from './modes/default';

interface JamRoomProps {
  handleGoBack: () => void;
  onInJamChat: () => void;
  onHostControls: () => void;
  onOpenJamInfo: () => void;
  onOpenPeople: () => void;
}

export type JamLayoutProps = { stableTracks: TrackReferenceOrPlaceholder[] };

export const getLayoutComponent = (
  participants: Participant[],
  isAnyParticipantSharingScreen: boolean,
): ComponentType<JamLayoutProps> => {
  if (isAnyParticipantSharingScreen) {
    return ScreenSharing;
  } else if (participants.length === 1) {
    return Alone;
  } else if (participants.length === 2) {
    return OneOnOne;
  } else {
    return Default;
  }
};

export const JamRoom: React.FC<JamRoomProps> = ({
  handleGoBack,
  onInJamChat,
  onHostControls,
  onOpenJamInfo,
  onOpenPeople,
}) => {
  const participants = useParticipants();

  const [jamMenuOpen, setJamMenuOpen] = useState(false);

  const screenCaptureRef =
    useRef<React.ComponentRef<typeof ScreenCapturePickerView> | null>(null);

  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: true },
    ],

    { onlySubscribed: false },
  );
  const stableTracks = useVisualStableUpdate(tracks, 5);

  const isAnyParticipantSharingScreen = stableTracks.filter(
    track =>
      track.participant.getTrackPublication(Track.Source.ScreenShare)
        ?.isSubscribed,
  ).length > 0;

  const Component = getLayoutComponent(participants, isAnyParticipantSharingScreen);


  return <>
    {jamMenuOpen && (
      <JamRoomMenu
        screenCaptureRef={screenCaptureRef}
        onInJamChat={onInJamChat}
        onHostControls={onHostControls}
        onOpenJamInfo={onOpenJamInfo}
        onOpenPeople={onOpenPeople}
        setJamMenuOpen={setJamMenuOpen}
      />
    )}
    <View className="flex-1 bg-primary-foreground">
      <JamHeader handleGoBack={handleGoBack} />
      <Component
        stableTracks={stableTracks}
      />
      <JamFooter
        handleGoBack={handleGoBack}
        screenCaptureRef={screenCaptureRef}
        toggleJamMenu={() => setJamMenuOpen(!jamMenuOpen)}
      />
      {Platform.OS === 'ios' && (
        <ScreenCapturePickerView ref={screenCaptureRef} />
      )}

    </View>
  </>;

};
