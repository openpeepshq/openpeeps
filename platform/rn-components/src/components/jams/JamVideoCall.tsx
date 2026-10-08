import React, { useEffect } from 'react';
import { AudioSession, useRoomContext } from '@livekit/react-native';
import type { DisconnectReason } from 'livekit-client';
import { useStableLiveKitRoom } from '~/lib/livekit/useStableLiveKitRoom';
import { JamConference } from './JamConference';

export interface JamVideoCallProps {
  token: string;
  serverUrl: string;
  /** Initial audio/video defaults. Useful for hand-off from `<JamLobby>`. */
  audio?: boolean;
  video?: boolean;
  /** Fired when the participant leaves the room, with LiveKit's reason. */
  onDisconnected?: (reason?: DisconnectReason) => void;
}

/**
 * Connects the app-level LiveKit `Room` (provided by the host via
 * `RoomContext.Provider`) and renders {@link JamConference}. The room object is
 * created once at app start so the first paint is never blank; see
 * `useStableLiveKitRoom` for why the stock `LiveKitRoom` is not used.
 */
export const JamVideoCall = ({
  token,
  serverUrl,
  audio = true,
  video = true,
  onDisconnected,
}: JamVideoCallProps) => {
  const room = useRoomContext();

  useEffect(() => {
    void AudioSession.startAudioSession();
    return () => {
      void AudioSession.stopAudioSession();
    };
  }, []);

  useStableLiveKitRoom(room, {
    token,
    serverUrl,
    connect: true,
    audio,
    video,
    screen: false,
    onDisconnected,
  });

  return <JamConference />;
};
