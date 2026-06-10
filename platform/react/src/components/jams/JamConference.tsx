import {
  RoomAudioRenderer,
  isTrackReference,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useJamObserver } from './JamContext';
import { JamParticipantConference } from './JamParticipantConference';
import { JamEventsProvider } from './JamEventsContext';
import { JamObserverShell } from './JamObserverShell';
import { JamVideoLayout } from './JamVideoLayout';

function JamObserverConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );

  const cameraTracks = tracks.filter(
    (track) => track.source === Track.Source.Camera,
  );
  const screenShareTracks = tracks.filter(
    (track) =>
      isTrackReference(track) &&
      track.publication.source === Track.Source.ScreenShare &&
      !track.publication.isMuted,
  );

  return (
    <JamObserverShell>
      <div className="min-h-0 flex-1" data-lk-theme="default">
        <JamVideoLayout
          cameraTracks={cameraTracks}
          screenShareTracks={screenShareTracks}
          observer
        />
      </div>
    </JamObserverShell>
  );
}

function JamObserverRoom() {
  return (
    <JamEventsProvider>
      <JamObserverConference />
      <RoomAudioRenderer />
    </JamEventsProvider>
  );
}

/**
 * In-call jam UI built from LiveKit layout primitives plus OpenPeeps persisted
 * chat and reaction overlays. Participants get a full conference layout with the
 * footer control bar (mic/camera/devices/screen-share/reactions/hand/record/
 * chat/people/leave) and a people drawer that includes waiting-room admission;
 * observers get a read-only grid.
 */
export function JamConference() {
  const observer = useJamObserver();

  if (observer) {
    return <JamObserverRoom />;
  }

  return <JamParticipantConference />;
}
