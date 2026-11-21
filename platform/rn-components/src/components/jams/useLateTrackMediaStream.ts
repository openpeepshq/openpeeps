import { useEffect, useRef, useState } from 'react';
import type { Track } from 'livekit-client';
import type { MediaStream } from '@livekit/react-native-webrtc';

// The RN runtime mediaStream is the @livekit/react-native-webrtc MediaStream,
// even though livekit-client's web types annotate it as the DOM MediaStream.
const asWebRtcStream = (track?: Track): MediaStream | undefined =>
  track?.mediaStream as MediaStream | undefined;

// A single remount is not enough for the first share of a call: the JS stream
// reports its video track (SDP apply) a beat before the native stream has the
// track registered (first frame / dynacast), so the native one-shot `streamURL`
// lookup that a single remount triggers can still run empty. A short, bounded
// burst of remounts after the first track appears gives the native attach a few
// chances to land once the stream is ready. Each extra remount is a cheap
// native view recreation, and the burst only happens on the rare late-share
// path — an already-attached share never sees one.
//
// The burst is bounded and self-clearing: `RETRY_BURST_ATTEMPTS = 4` ticks at
// `RETRY_BURST_INTERVAL_MS = 300`; the first three ticks bump (300/600/900 ms
// after the transition bump, ~1.2 s window), and the fourth (1200 ms) is
// consumed by the interval-clear branch — so exactly 3 extra remounts land.
const RETRY_BURST_ATTEMPTS = 4;
const RETRY_BURST_INTERVAL_MS = 300;

export interface LateTrackMediaStream {
  /**
   * Changes when the stream gains its first video track and again on a short
   * burst of retries immediately after, so the native view re-runs its
   * one-shot `streamURL` attach a few times while the native stream settles.
   */
  remountKey: number;
}

/**
 * Tracks the video-track count on a track's media stream and derives a
 * remount key from it.
 *
 * A screen share that starts after we have joined is attached to the native
 * `RTCView` by a one-time `streamURL` lookup of the stream's video track. When
 * that lookup runs before the stream carries its video track, iOS gives up (no
 * retry) and the tile stays black until we leave and rejoin. Re-keying the
 * `VideoTrack` with `remountKey` remounts the native view when the stream gains
 * its video track — and again a few times over the next second or so — so the
 * one-shot lookup re-runs until it can succeed.
 *
 * The poll is not redundant with the `addtrack` listener: on the first share,
 * `addtrack` fires inside the native SDP-apply batch, before the room re-emits
 * the publication that mounts this layout — so the event can fire before the
 * listener exists.
 *
 * Camera tiles don't need this: they remount on the track object itself
 * (see `JamCallParticipant`), which is a different (renegotiation) case.
 */
export const useLateTrackMediaStream = (
  track?: Track
): LateTrackMediaStream => {
  const mediaStream = asWebRtcStream(track);
  const [remountKey, setRemountKey] = useState(0);
  // Previous video-track count on the current stream, so the 0 → 1 transition
  // (first track arriving) is detected inside the effect.
  const prevCountRef = useRef(0);

  useEffect(() => {
    if (!mediaStream) {
      return;
    }
    setRemountKey(0);
    prevCountRef.current = mediaStream.getVideoTracks().length;

    let pollTimer: ReturnType<typeof setInterval> | undefined;
    let burstTimer: ReturnType<typeof setInterval> | undefined;

    const startBurst = () => {
      // The first track just appeared: the view re-mounts once for it (key
      // bumped by `refresh`'s `justGotFirst` branch, immediately before this
      // call), then nudge a few extra remounts while the native stream
      // catches up (it registers the track on its first frame, which can
      // lag the JS-side SDP apply).
      let extra = 0;
      burstTimer = setInterval(() => {
        if (++extra >= RETRY_BURST_ATTEMPTS) {
          clearInterval(burstTimer!);
          return;
        }
        setRemountKey((key) => key + 1);
      }, RETRY_BURST_INTERVAL_MS);
    };

    const refresh = () => {
      const count = mediaStream.getVideoTracks().length;
      const justGotFirst = count > 0 && prevCountRef.current === 0;
      prevCountRef.current = count;
      if (justGotFirst) {
        setRemountKey((key) => key + 1);
        startBurst();
        if (pollTimer) clearInterval(pollTimer);
      }
    };
    refresh();
    if (prevCountRef.current === 0) {
      // 20 x 150 ms (~3 s) covers the first-share negotiation window; stop as
      // soon as the stream carries its track so an already-attached share
      // causes no further remounts.
      let attempts = 0;
      pollTimer = setInterval(() => {
        refresh();
        if (mediaStream.getVideoTracks().length > 0 || ++attempts >= 20) {
          clearInterval(pollTimer!);
        }
      }, 150);
    }
    mediaStream.addEventListener('addtrack', refresh);
    return () => {
      if (pollTimer) clearInterval(pollTimer);
      if (burstTimer) clearInterval(burstTimer);
      mediaStream.removeEventListener('addtrack', refresh);
      prevCountRef.current = 0;
    };
  }, [mediaStream]);

  return { remountKey };
};
