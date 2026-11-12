import { useEffect, useState } from 'react';
import type { Track } from 'livekit-client';
import type MediaStream from '@livekit/react-native-webrtc/src/MediaStream';

/**
 * The number of video tracks on the track's media stream, kept in sync with
 * `addtrack` events.
 *
 * A screen share that starts after we have joined is attached to the native
 * `RTCView` by a one-time `streamURL` lookup of the stream's video track. When
 * that lookup runs before the stream carries its video track, iOS gives up (no
 * retry) and the tile stays black until we leave and rejoin. Re-keying the
 * `VideoTrack` with this count remounts the native view once the stream gains
 * its video track, giving the lookup a second chance when it can succeed.
 *
 * Camera tiles don't need this: they remount on the track object itself
 * (see `JamCallParticipant`), which is a different (renegotiation) case.
 */
export const useLateTrackMediaStream = (track?: Track) => {
  const mediaStream = track?.mediaStream as MediaStream | undefined;
  const [hasVideoTrack, setHasVideoTrack] = useState(
    () => mediaStream?.getVideoTracks().length ?? 0
  );

  useEffect(() => {
    if (!mediaStream) {
      setHasVideoTrack(0);
      return;
    }
    const refresh = () => setHasVideoTrack(mediaStream.getVideoTracks().length);
    refresh();
    mediaStream.addEventListener('addtrack', refresh);
    return () => {
      mediaStream.removeEventListener('addtrack', refresh);
    };
  }, [mediaStream]);

  return hasVideoTrack;
};
