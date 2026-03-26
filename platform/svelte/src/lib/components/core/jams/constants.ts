import { type RoomOptions, VideoPresets } from 'livekit-client';

export const defaultRoomOptions: Record<string, RoomOptions> = {
	'video-call': {
		adaptiveStream: true,
		dynacast: true,
		publishDefaults: {
			simulcast: true,
			videoSimulcastLayers: [VideoPresets.h90, VideoPresets.h216],
			videoCodec: 'vp9',
			backupCodec: {
				codec: 'vp8'
			}
		},
		videoCaptureDefaults: {
			resolution: {
				width: 256,
				height: 256
			}
		},
		audioCaptureDefaults: {
			noiseSuppression: true,
			echoCancellation: true
		}
	}
};
export const RECORD_OPTIONS = [
	'Record both audio and video',
	'Record just audio',
	'Record just video'
];

export const emojis = ['💖', '👍🏿', '🎉', '👏🏿', '😂', '😮', '😥', '🤔', '👎🏿'];
