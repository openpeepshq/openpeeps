import { useMemo } from 'react';
import { LiveKitRoom } from '@livekit/components-react';
import { defaultRoomOptions } from './constants';
import { useJamContext } from './JamContext';
import { JamConference } from './JamConference';

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
 * Connects to LiveKit and renders {@link JamConference} — LiveKit layout
 * primitives plus OpenPeeps persisted chat, reaction overlays, moderator
 * tools, and the waiting-room admit panel.
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
      <JamConference />
    </LiveKitRoom>
  );
}
