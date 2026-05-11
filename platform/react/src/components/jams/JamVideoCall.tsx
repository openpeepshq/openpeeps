import { useMemo } from 'react';
import {
  LiveKitRoom,
  VideoConference,
  RoomAudioRenderer,
} from '@livekit/components-react';
import '@livekit/components-styles';
import { defaultRoomOptions } from './constants';
import { useJamContext } from './JamContext';

export interface JamVideoCallProps {
  token: string;
  serverUrl: string;
  /** Initial audio/video defaults. Useful for hand-off from `<JamLobby>`. */
  audio?: boolean;
  video?: boolean;
  /** Fired when the participant leaves the room. */
  onDisconnected?: () => void;
}

/**
 * Wraps LiveKit's prebuilt `<VideoConference>` UI inside a `<LiveKitRoom>` so
 * the React port renders a complete jam session with one component. Mirrors
 * `core/jams/roomTypes/videoCall/VideoCall.svelte` at a high level.
 *
 * The custom Svelte UI (chat drawer, mode-specific grids, screen sharing
 * tile, mobile/desktop footers) is replaced by LiveKit's first-party
 * `VideoConference` to keep this port focused. Custom drawers and controls
 * can layer on later by composing `useTracks`, `ParticipantTile`, etc.
 */
export function JamVideoCall({
  token,
  serverUrl,
  audio = true,
  video = true,
  onDisconnected,
}: JamVideoCallProps) {
  const { jam } = useJamContext();
  const roomOptions = useMemo(
    () => defaultRoomOptions[jam.type] ?? defaultRoomOptions['video-call'],
    [jam.type],
  );

  return (
    <LiveKitRoom
      serverUrl={serverUrl}
      token={token}
      audio={audio}
      video={video}
      options={roomOptions}
      data-lk-theme="default"
      style={{ height: '100vh', width: '100vw' }}
      onDisconnected={onDisconnected}
    >
      <VideoConference />
      <RoomAudioRenderer />
    </LiveKitRoom>
  );
}
