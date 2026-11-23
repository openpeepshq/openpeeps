import { useEffect, useRef, useState } from 'react';
import type { Track } from 'livekit-client';
import type { MediaStream } from '@livekit/react-native-webrtc';

// The RN runtime mediaStream is the @livekit/react-native-webrtc MediaStream,
// even though livekit-client's web types annotate it as the DOM MediaStream.
const asWebRtcStream = (track?: Track): MediaStream | undefined =>
  track?.mediaStream as MediaStream | undefined;

// A single remount is not enough for a late share: the JS stream reports its
// video track (SDP apply) before the native stream has the track registered
// (first frame / dynacast), so the native one-shot `streamURL` lookup that a
// remount triggers can run empty. The retry schedule below gives the attach a
// sequence of bounded chances to land while the native stream settles. Each
// extra remount is a cheap native view recreation, and the whole schedule only
// ever runs on the rare late-share path — an already-attached share never
// sees any of it.
//
// The schedule has two parts:
//
// 1. A tight burst right after the first track appears: `RETRY_BURST_ATTEMPTS`
//    = 4 ticks at `RETRY_BURST_INTERVAL_MS` = 300; the first three ticks bump
//    (300/600/900 ms after the transition bump) and the fourth (1200 ms) is
//    consumed by the interval-clear branch — so exactly 3 extra remounts land
//    within ~1.2 s. This covers the warm-connection case (subsequent shares),
//    where the native stream registers its track almost at the same time as
//    the JS one.
//
// 2. A sparse tail: `RETRY_TAIL_ATTEMPTS` = 5 ticks at
//    `RETRY_TAIL_INTERVAL_MS` = 2000 ms each — ticks 1–4 bump (remounts at
//    2 s, 4 s, 6 s and 8 s after the burst ends) and tick 5 (10 s) is
//    consumed by the interval-clear branch, exactly as the burst's 4th tick
//    clears it (the N constant counts ticks, the last one clears). The FIRST
//    share in a Jam adds a new m-line, so the receiver renegotiates and
//    re-establishes ICE before the native stream registers the video track —
//    that can take several seconds, well past the ~1.2 s burst. The tail is
//    the part that fixes that case (verified against the QA report: the
//    initial share of a Jam stayed black while subsequent shares worked).
//    After the tail's clear tick, the schedule is fully over and
//    self-cleared: no further remounts and no live timers.
const RETRY_BURST_ATTEMPTS = 4;
const RETRY_BURST_INTERVAL_MS = 300;
const RETRY_TAIL_ATTEMPTS = 5;
const RETRY_TAIL_INTERVAL_MS = 2000;

export interface LateTrackMediaStream {
  /**
   * Changes when the stream gains its first video track and again on the
   * bounded retry schedule (tight burst, then sparse backoff tail) while the
   * native stream settles, so the native view re-runs its one-shot `streamURL`
   * attach until it can succeed — including the first share of a Jam, whose
   * renegotiation delays the native track registration past the burst window.
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
 * its video track — and again on the bounded retry schedule — so the one-shot
 * lookup re-runs until it can succeed.
 *
 * The poll is not redundant with the `addtrack` listener: on the first share,
 * `addtrack` fires inside the native SDP-apply batch, before the room re-emits
 * the publication that mounts this layout — so the event can fire before the
 * listener exists.
 *
 * Camera tiles use the same mechanism (see `JamCallParticipant`): a first
 * mid-Jam camera publish has the same race — the JS track exists before the
 * native stream carries its video track, so the one-shot attach needs the
 * same late-track remount burst (#1808).
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
    let tailTimer: ReturnType<typeof setInterval> | undefined;

    const startTail = () => {
      // Sparse retries for the first share of a Jam: its m-line forces a
      // receiver-side renegotiation, so the native stream can register its
      // video track seconds after the JS-side SDP apply — past the tight
      // burst. Remounts at 2 s, 4 s, 6 s and 8 s after the burst (ticks 1–4
      // bump); the 5th tick (10 s) clears the interval and ends the schedule.
      let extra = 0;
      tailTimer = setInterval(() => {
        if (++extra >= RETRY_TAIL_ATTEMPTS) {
          clearInterval(tailTimer!);
          return;
        }
        setRemountKey((key) => key + 1);
      }, RETRY_TAIL_INTERVAL_MS);
    };

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
          startTail();
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
      if (tailTimer) clearInterval(tailTimer);
      mediaStream.removeEventListener('addtrack', refresh);
      prevCountRef.current = 0;
    };
  }, [mediaStream]);

  return { remountKey };
};
