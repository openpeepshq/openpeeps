import React from 'react';
import { View } from 'react-native';
import {
  isTrackReference,
  useRoomContext,
  useTracks,
} from '@livekit/react-native';
import { Track } from 'livekit-client';
import { JamEventsProvider, useJamObserver } from '@openpeepshq/react';
import { JamObserverShell } from './JamObserverShell';
import { JamParticipantConference } from './JamParticipantConference';
import { JamVideoLayout } from './JamVideoLayout';

const JamObserverConference = () => {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true }
  );

  // Observers join hidden and must not see their own (camera-less) tile.
  const cameraTracks = tracks.filter(
    (track) =>
      track.source === Track.Source.Camera && !track.participant.isLocal
  );
  const screenShareTracks = tracks.filter(
    (track) =>
      isTrackReference(track) &&
      track.publication.source === Track.Source.ScreenShare &&
      !track.publication.isMuted
  );

  return (
    <JamObserverShell>
      <View className="min-h-0 flex-1">
        <JamVideoLayout
          cameraTracks={cameraTracks}
          screenShareTracks={screenShareTracks}
          observer
        />
      </View>
    </JamObserverShell>
  );
};

const JamObserverRoom = () => {
  const room = useRoomContext();
  return (
    <JamEventsProvider room={room}>
      <JamObserverConference />
    </JamEventsProvider>
  );
};

/**
 * In-call jam UI: participants get the full conference layout with the footer
 * control bar and drawers; observers get a read-only grid with chat.
 */
export const JamConference = () => {
  const observer = useJamObserver();

  if (observer) {
    return <JamObserverRoom />;
  }

  return <JamParticipantConference />;
};
