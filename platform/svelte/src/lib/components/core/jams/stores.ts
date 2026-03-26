import {
	ConnectionQuality,
	type ConnectionState,
	type Participant,
	ParticipantEvent,
	Room,
	RoomEvent,
	Track
} from 'livekit-client';
import { derived, readable, writable } from 'svelte/store';
import { persisted } from 'svelte-persisted-store';
import type { LocalJamSettings, MediaPermissions } from '$lib/components/core/jams/types';
import Kind = Track.Kind;
import type { JamEvent } from '@openpeeps/common/types';
import { isObserver } from './helpers';

const roomStore =
	<T>(events: RoomEvent[], transformer: (room: Room) => T) =>
		(room: Room) =>
			readable<T>(transformer(room), (set) => {
				const listener = () => set(transformer(room));
				const interval = setInterval(listener, 2000);
				for (const event of events) {
					room.on(event, listener);
				}
				return () => {
					clearInterval(interval);
					for (const event of events) {
						room.removeListener(event, listener);
					}
				};
			});

export const participantStore =
	<T, P extends Participant = Participant>(
		events: ParticipantEvent[],
		transformer: (participant: P) => T
	) =>
		(participant: P) =>
			readable<T>(transformer(participant), (set) => {
				const listener = () => set(transformer(participant));
				const interval = setInterval(listener, 2000);
				for (const event of events) {
					// @ts-expect-error because of a typing error in livekit SDK
					participant.on(event, listener);
				}
				return () => {
					clearInterval(interval);
					for (const event of events) {
						// @ts-expect-error because of a typing error in livekit SDK
						participant.removeListener(event, listener);
					}
				};
			});

export const jamSettingsStore = persisted<LocalJamSettings>('allpeep-jam-settings', {
	defaults: {
		audio: true,
		video: false,
		screenShare: false,
		speaker: true
	},
	deviceIds: {
		microphone: '',
		camera: '',
		speaker: ''
	}
});

export const connectionStateStore = roomStore<ConnectionState>(
	[RoomEvent.ConnectionQualityChanged, RoomEvent.ConnectionStateChanged],
	(room) => room.state
);

const getTracksFromParticipant = (participant: Participant): Track<Kind>[] => {
	const publicationsArray = [...participant.trackPublications.values()];
	return publicationsArray.map((tp) => tp.track).filter(Boolean) as Track<Kind>[];
};

export const participantTracksStore = participantStore(
	[
		ParticipantEvent.LocalTrackPublished,
		ParticipantEvent.LocalTrackUnpublished,
		ParticipantEvent.TrackPublished,
		ParticipantEvent.TrackUnpublished,
		ParticipantEvent.TrackMuted,
		ParticipantEvent.TrackUnmuted
	],
	getTracksFromParticipant
);

export const participantCameraTrackStore = (participant: Participant) =>
	derived(
		participantTracksStore(participant),
		($trackList) =>
			$trackList.filter((t) => t.kind === Track.Kind.Video && t.source === Track.Source.Camera)[0]
	);

export const participantMicrophoneTrackStore = (participant: Participant) =>
	derived(
		participantTracksStore(participant),
		($trackList) =>
			$trackList.filter(
				(t) => t.kind === Track.Kind.Audio && t.source === Track.Source.Microphone
			)[0]
	);


export const participantScreenShareTrackStore = (participant: Participant) =>
	derived(
		participantTracksStore(participant),
		($trackList) =>
			$trackList.filter(
				(t) => t.kind === Track.Kind.Video && t.source === Track.Source.ScreenShare
			)[0]
	);

export const participantListStore = roomStore(
	[
		RoomEvent.ParticipantConnected,
		RoomEvent.ParticipantDisconnected,
		RoomEvent.TrackMuted,
		RoomEvent.TrackUnmuted
	],
	(room): Participant[] =>
		isObserver(room) ? [...room.remoteParticipants.values()] : [room.localParticipant, ...room.remoteParticipants.values()]
);

export const participantScreenShareListStore = roomStore(
	[
		RoomEvent.ParticipantConnected,
		RoomEvent.LocalTrackPublished,
		RoomEvent.LocalTrackUnpublished,
		RoomEvent.ParticipantDisconnected,
		RoomEvent.TrackMuted,
		RoomEvent.TrackUnmuted,
		RoomEvent.TrackStreamStateChanged,
		RoomEvent.VideoPlaybackStatusChanged,
		RoomEvent.TrackSubscribed,
		RoomEvent.TrackUnsubscribed,
		RoomEvent.TranscriptionReceived
	],
	(room) =>
		[room.localParticipant, ...room.remoteParticipants.values()].filter(
			(p) => p.isScreenShareEnabled
		)
);

export const microphoneStateStore = participantStore<boolean>(
	[
		ParticipantEvent.LocalTrackPublished,
		ParticipantEvent.LocalTrackUnpublished,
		ParticipantEvent.TrackMuted,
		ParticipantEvent.TrackUnmuted
	],
	(p) => p.isMicrophoneEnabled
);

export const cameraStateStore = participantStore<boolean>(
	[
		ParticipantEvent.LocalTrackPublished,
		ParticipantEvent.LocalTrackUnpublished,
		ParticipantEvent.TrackMuted,
		ParticipantEvent.TrackUnmuted
	],
	(p) => p.isCameraEnabled
);

export const screenShareStateStore = participantStore<boolean>(
	[
		ParticipantEvent.LocalTrackPublished,
		ParticipantEvent.LocalTrackUnpublished,
		ParticipantEvent.TrackMuted,
		ParticipantEvent.TrackUnmuted
	],
	(p) => p.isScreenShareEnabled
);

export const participantHandRaisedStore = participantStore<boolean>(
	[ParticipantEvent.ParticipantMetadataChanged],
	(p) => {
		try {
			const metadata = JSON.parse(p.metadata || '{}');
			return !!metadata.handRaised;
		} catch (e) {
			console.error(e);
			return false;
		}
	}
);

export const participantAudioLevelStore = participantStore<number>(
	[ParticipantEvent.IsSpeakingChanged],
	(p) => p.audioLevel * 10
);

export const connectionQualityStore = roomStore<ConnectionQuality>(
	[RoomEvent.ConnectionQualityChanged],
	(room) => room.localParticipant.connectionQuality
);

export const ownReactionsStore = writable<JamEvent[]>([]);

let reactionCleanupInterval: NodeJS.Timeout | null = null;

export const addOwnReaction = (reaction: JamEvent) => {
	ownReactionsStore.update((reactions) => [...reactions, reaction]);

	if (!reactionCleanupInterval) {
		reactionCleanupInterval = setInterval(() => {
			ownReactionsStore.update((reactions) => {
				const fiveSecondsAgo = Date.now() - 5000;
				const filteredReactions = reactions.filter(r =>
					new Date(r.createdAt).getTime() > fiveSecondsAgo
				);

				if (filteredReactions.length === 0 && reactionCleanupInterval) {
					clearInterval(reactionCleanupInterval);
					reactionCleanupInterval = null;
				}

				return filteredReactions;
			});
		}, 5000);
	}
};

export const stopReactionCleanup = () => {
	if (reactionCleanupInterval) {
		clearInterval(reactionCleanupInterval);
		reactionCleanupInterval = null;
	}
};

export const mediaPermissionsStore = writable<MediaPermissions>({
	camera: true,
	microphone: true,
	speaker:true,
	lastDenied: {}
});
