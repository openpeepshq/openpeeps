import { useEffect, useState } from 'react';
import type { Track } from 'livekit-client';
import type { MediaStream } from '@livekit/react-native-webrtc';

// The RN runtime mediaStream is the @livekit/react-native-webrtc MediaStream,
// even though livekit-client's web types annotate it as the DOM MediaStream.
const asWebRtcStream = (track?: Track): MediaStream | undefined =>
  track?.mediaStream as MediaStream | undefined;

/**
 * The number of video tracks on the track's media stream, kept in sync with
 * `addtrack` events plus a short post-mount poll.
 *
 * A screen share that starts after we have joined is attached to the native
 * `RTCView` by a one-time `streamURL` lookup of the stream's video track. When
 * that lookup runs before the stream carries its video track, iOS gives up (no
 * retry) and the tile stays black until we leave and rejoin. Re-keying the
 * `VideoTrack` with this count remounts the native view once the stream gains
 * its video track, giving the lookup a second chance when it can succeed.
 *
 * The poll is not redundant with the `addtrack` listener: on the first share,
 * `addtrack` fires inside the native SDP-apply batch, before the room re-emits
 * the publication that mounts this layout — so the event can fire before the
 * listener exists.
 *
 * Camera tiles don't need this: they remount on the track object itself
 * (see `JamCallParticipant`), which is a different (renegotiation) case.
 */
export const useLateTrackMediaStream = (track?: Track) => {
  const mediaStream = asWebRtcStream(track);
  const [videoTrackCount, setVideoTrackCount] = useState(
    () => asWebRtcStream(track)?.getVideoTracks().length ?? 0
  );

  useEffect(() => {
    if (!mediaStream) {
      setVideoTrackCount(0);
      return;
    }
    const refresh = () =>
      setVideoTrackCount(mediaStream.getVideoTracks().length);
    refresh();
    // 20 x 150 ms (~3 s) covers the first-share negotiation window; stop as
    // soon as the stream carries its track so an already-attached share
    // causes no further remounts.
    let attempts = 0;
    const timer = setInterval(() => {
      refresh();
      if (mediaStream.getVideoTracks().length > 0 || ++attempts >= 20) {
        clearInterval(timer);
      }
    }, 150);
    mediaStream.addEventListener('addtrack', refresh);
    return () => {
      clearInterval(timer);
      mediaStream.removeEventListener('addtrack', refresh);
    };
  }, [mediaStream]);

  return videoTrackCount;
};
