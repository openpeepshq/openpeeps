import {
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  VideoConference,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useJamObserver } from './JamContext';
import { JamModeratorToolbar } from './JamModeratorToolbar';
import { JamWaitingRoomPanel } from './JamWaitingRoomPanel';

function JamObserverConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );

  return (
    <div className="lk-video-conference" data-lk-theme="default" style={{ height: '100vh' }}>
      <div className="lk-grid-layout-wrapper" style={{ height: '100%' }}>
        <GridLayout tracks={tracks}>
          <ParticipantTile />
        </GridLayout>
      </div>
      <RoomAudioRenderer />
    </div>
  );
}

/**
 * In-call jam UI built from LiveKit prefabs and layout primitives. Participants
 * get the full {@link VideoConference} (grid, screen share, chat, controls);
 * observers get a read-only {@link GridLayout}. OpenPeeps-specific moderator
 * tools and the waiting-room panel layer on top.
 */
export function JamConference() {
  const observer = useJamObserver();

  if (observer) {
    return (
      <>
        <JamObserverConference />
        <JamModeratorToolbar />
      </>
    );
  }

  return (
    <>
      <VideoConference />
      <RoomAudioRenderer />
      <JamWaitingRoomPanel />
      <JamModeratorToolbar />
    </>
  );
}
