import type { DisconnectReason, RoomConnectOptions } from 'livekit-client';
import {
  MediaDeviceFailure,
  Room,
  RoomEvent,
  type AudioCaptureOptions,
  type ScreenShareCaptureOptions,
  type VideoCaptureOptions,
} from 'livekit-client';
import * as React from 'react';

/**
 * Mirrors {@link useLiveKitRoom} connection/event wiring but for a Room that
 * already exists on the first render. The stock LiveKitRoom component only mounts
 * children after an effect creates the Room, which leaves React Native on a blank
 * first paint (often perceived as a stuck white screen).
 */
export function useStableLiveKitRoom(
  room: Room,
  params: {
    token?: string;
    serverUrl?: string;
    connect: boolean;
    audio: boolean | AudioCaptureOptions;
    video: boolean | VideoCaptureOptions;
    screen: boolean | ScreenShareCaptureOptions;
    connectOptions?: RoomConnectOptions;
    onConnected?: () => void;
    onDisconnected?: (reason?: DisconnectReason) => void;
    onError?: (error: Error) => void;
    onMediaDeviceFailure?: (failure?: ReturnType<typeof MediaDeviceFailure.getFailure>, kind?: string) => void;
    onEncryptionError?: (error: Error) => void;
    simulateParticipants?: number;
  },
): void {
  const {
    token,
    serverUrl,
    connect,
    audio,
    video,
    screen,
    connectOptions,
    onConnected,
    onDisconnected,
    onError,
    onMediaDeviceFailure,
    onEncryptionError,
    simulateParticipants,
  } = params;

  const shouldConnect = React.useRef(connect);

  React.useEffect(() => {
    const onSignalConnected = () => {
      const localP = room.localParticipant;

      Promise.all([
        localP.setMicrophoneEnabled(!!audio, typeof audio !== 'boolean' ? audio : undefined),
        localP.setCameraEnabled(!!video, typeof video !== 'boolean' ? video : undefined),
        localP.setScreenShareEnabled(!!screen, typeof screen !== 'boolean' ? screen : undefined),
      ]).catch((e: unknown) => {
        onError?.(e as Error);
      });
    };

    const handleMediaDeviceError = (e: Error, kind: string) => {
      const mediaDeviceFailure = MediaDeviceFailure.getFailure(e);
      onMediaDeviceFailure?.(mediaDeviceFailure, kind);
    };
    const handleEncryptionError = (e: Error) => {
      onEncryptionError?.(e);
    };
    const handleDisconnected = (reason?: DisconnectReason) => {
      onDisconnected?.(reason);
    };
    const handleConnected = () => {
      onConnected?.();
    };

    room
      .on(RoomEvent.SignalConnected, onSignalConnected)
      .on(RoomEvent.MediaDevicesError, handleMediaDeviceError)
      .on(RoomEvent.EncryptionError, handleEncryptionError)
      .on(RoomEvent.Disconnected, handleDisconnected)
      .on(RoomEvent.Connected, handleConnected);

    return () => {
      room
        .off(RoomEvent.SignalConnected, onSignalConnected)
        .off(RoomEvent.MediaDevicesError, handleMediaDeviceError)
        .off(RoomEvent.EncryptionError, handleEncryptionError)
        .off(RoomEvent.Disconnected, handleDisconnected)
        .off(RoomEvent.Connected, handleConnected);
    };
  }, [
    room,
    audio,
    video,
    screen,
    onError,
    onEncryptionError,
    onMediaDeviceFailure,
    onConnected,
    onDisconnected,
  ]);

  React.useEffect(() => {
    if (simulateParticipants) {
      room.simulateParticipants({
        participants: {
          count: simulateParticipants,
        },
        publish: {
          audio: true,
          useRealTracks: true,
        },
      });
      return;
    }

    if (connect) {
      shouldConnect.current = true;
      if (!token) {
        return;
      }
      if (!serverUrl) {
        onError?.(Error('no livekit url provided'));
        return;
      }
      room.connect(serverUrl, token, connectOptions).catch((e: unknown) => {
        if (shouldConnect.current === true) {
          onError?.(e as Error);
        }
      });
    } else {
      shouldConnect.current = false;
      room.disconnect();
    }
  }, [connect, token, JSON.stringify(connectOptions), room, onError, serverUrl, simulateParticipants]);

  React.useEffect(() => {
    return () => {
      room.disconnect();
    };
  }, [room]);
}
