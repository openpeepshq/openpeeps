import {
  GridLayout,
  RoomAudioRenderer,
  useTracks,
} from '@livekit/components-react';
import { Track } from 'livekit-client';
import { useJamObserver } from './JamContext';
import { JamModeratorToolbar } from './JamModeratorToolbar';
import { JamParticipantConference } from './JamParticipantConference';
import { JamEventsProvider } from './JamEventsContext';
import { JamParticipantTile } from './JamParticipantTile';
import { JamWaitingRoomPanel } from './JamWaitingRoomPanel';
import { JamObserverShell } from './JamObserverShell';

function JamObserverConference() {
  const tracks = useTracks(
    [
      { source: Track.Source.Camera, withPlaceholder: true },
      { source: Track.Source.ScreenShare, withPlaceholder: false },
    ],
    { onlySubscribed: true },
  );

  return (
    <JamObserverShell>
      <div
        className="lk-video-conference min-h-0 flex-1"
        data-lk-theme="default"
      >
        <div className="lk-grid-layout-wrapper h-full">
          <GridLayout tracks={tracks}>
            <JamParticipantTile />
          </GridLayout>
        </div>
      </div>
    </JamObserverShell>
  );
}

function JamObserverRoom() {
  return (
    <JamEventsProvider>
      <JamObserverConference />
      <RoomAudioRenderer />
      <JamModeratorToolbar />
    </JamEventsProvider>
  );
}

/**
 * In-call jam UI built from LiveKit layout primitives plus OpenPeeps persisted
 * chat and reaction overlays. Participants get a full conference layout;
 * observers get a read-only grid. Moderator tools and the waiting-room panel
 * layer on top for hosts.
 */
export function JamConference() {
  const observer = useJamObserver();

  if (observer) {
    return <JamObserverRoom />;
  }

  return (
    <>
      <JamParticipantConference />
      <JamWaitingRoomPanel />
      <JamModeratorToolbar />
    </>
  );
}
