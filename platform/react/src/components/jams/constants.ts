import { type RoomOptions, VideoPresets } from 'livekit-client';

/**
 * Defaults for LiveKit `Room` keyed by jam `type`. Tweaks here apply to every
 * `<JamRoom>` automatically.
 */
export const defaultRoomOptions: Record<string, RoomOptions> = {
  'video-call': {
    adaptiveStream: true,
    dynacast: true,
    // Prefer reconnect over tearing down the session when the tab is
    // backgrounded. livekit-client still disconnects on `freeze`; JamRoom
    // re-tokens and rejoins when the page becomes visible again.
    disconnectOnPageLeave: false,
    publishDefaults: {
      simulcast: true,
      videoSimulcastLayers: [VideoPresets.h90, VideoPresets.h216],
      videoCodec: 'vp9',
      backupCodec: {
        codec: 'vp8',
      },
    },
    videoCaptureDefaults: {
      resolution: {
        width: 256,
        height: 256,
      },
    },
    audioCaptureDefaults: {
      noiseSuppression: true,
      echoCancellation: true,
    },
  },
};

export const JAM_EMOJIS = [
  '💖',
  '👍🏿',
  '🎉',
  '👏🏿',
  '😂',
  '😮',
  '😥',
  '🤔',
  '👎🏿',
];

/** Alias mirroring the Svelte `emojis` export used by the reaction picker. */
export const emojis = JAM_EMOJIS;

export const audioOutputSupported =
  typeof HTMLMediaElement !== 'undefined' &&
  'setSinkId' in HTMLMediaElement.prototype;
