import { useEffect } from 'react';
import { useRoomContext } from '@livekit/components-react';
import {
  RoomEvent,
  Track,
  isRemoteTrack,
  type RemoteTrack,
} from 'livekit-client';

const FRAME_MS = 20;
const CALIBRATION_DELTAS = 3;
const WARMUP_FRAMES = 8;
/**
 * Audio older than this is the backlog Chromium otherwise holds and then
 * plays faster until it matches the person speaking now.
 */
const LATE_MS = 200;

type StampedFrame = { timestamp: number };

type EncodedReceiver = RTCRtpReceiver & {
  createEncodedStreams?: () => {
    readable: ReadableStream<StampedFrame>;
    writable: WritableStream<StampedFrame>;
  };
};

/** Opus frames are 20ms apart. The median gap is the receiver clock. */
export const audioClockPerMs = (deltas: number[]): number | undefined => {
  if (deltas.length < CALIBRATION_DELTAS) return undefined;
  const sorted = [...deltas].sort((a, b) => a - b);
  const mid = sorted[Math.floor(sorted.length / 2)];
  if (mid === undefined || mid <= 0) return undefined;
  return mid / FRAME_MS;
};

export const isLateAudioFrame = (
  timestamp: number,
  expectedTimestamp: number,
  clockPerMs: number,
): boolean =>
  clockPerMs > 0 && (expectedTimestamp - timestamp) / clockPerMs > LATE_MS;

/**
 * Drop microphone frames that arrive already late, so Chromium's jitter
 * buffer never builds the backlog it later time-stretches.
 * Returns when the receiver has no encoded-stream hook or it was already taken.
 */
export const installLateAudioDrop = (
  receiver: EncodedReceiver,
  now: () => number = () => performance.now(),
): Promise<void> | undefined => {
  if (!receiver.createEncodedStreams) return undefined;
  let readable: ReadableStream<StampedFrame>;
  let writable: WritableStream<StampedFrame>;
  try {
    ({ readable, writable } = receiver.createEncodedStreams());
  } catch {
    return undefined;
  }

  let anchorTimestamp: number | undefined;
  let anchorWall: number | undefined;
  let lastTimestamp: number | undefined;
  let seen = 0;
  const deltas: number[] = [];
  let clockPerMs: number | undefined;

  return readable
    .pipeThrough(
      new TransformStream<StampedFrame, StampedFrame>({
        transform: (frame, controller) => {
          let forwarded = false;
          const forward = () => {
            if (forwarded) return;
            forwarded = true;
            controller.enqueue(frame);
          };
          try {
            const wall = now();
            if (
              lastTimestamp !== undefined &&
              deltas.length < CALIBRATION_DELTAS
            ) {
              deltas.push(frame.timestamp - lastTimestamp);
              clockPerMs = audioClockPerMs(deltas);
            }
            if (anchorTimestamp === undefined) {
              anchorTimestamp = frame.timestamp;
              anchorWall = wall;
            }
            lastTimestamp = frame.timestamp;
            seen += 1;
            const expected =
              anchorTimestamp +
              (wall - (anchorWall ?? wall)) * (clockPerMs ?? 0);
            if (
              clockPerMs !== undefined &&
              seen > WARMUP_FRAMES &&
              isLateAudioFrame(frame.timestamp, expected, clockPerMs)
            ) {
              // Closing a skipped frame tears the receiver down and the
              // rest of the call goes silent.
              return;
            }
            forward();
          } catch {
            forward();
          }
        },
      }),
    )
    .pipeTo(writable)
    .catch(() => undefined);
};

/** Skip late remote microphone audio for everyone in this room. */
export const useDropLateAudio = () => {
  const room = useRoomContext();

  useEffect(() => {
    const installed = new WeakSet<RTCRtpReceiver>();
    const install = (track: RemoteTrack, source: Track.Source) => {
      if (
        track.kind !== Track.Kind.Audio ||
        source !== Track.Source.Microphone ||
        !track.receiver ||
        installed.has(track.receiver)
      ) {
        return;
      }
      installed.add(track.receiver);
      installLateAudioDrop(track.receiver);
    };

    room.remoteParticipants.forEach((participant) => {
      participant.audioTrackPublications.forEach((publication) => {
        if (isRemoteTrack(publication.track)) {
          install(publication.track, publication.source);
        }
      });
    });

    const onSubscribed = (
      track: RemoteTrack,
      publication: { source: Track.Source },
    ) => {
      install(track, publication.source);
    };
    room.on(RoomEvent.TrackSubscribed, onSubscribed);
    return () => {
      room.off(RoomEvent.TrackSubscribed, onSubscribed);
    };
  }, [room]);
};
