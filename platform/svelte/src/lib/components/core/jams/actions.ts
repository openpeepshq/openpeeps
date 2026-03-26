import type {
	Jam,
	JamEvent,
	JamSettings,
	PublicProfile,
} from "@openpeeps/common/types";
import {
	blurProcessor,
	imageProcessor,
	transformStream,
	videoProcessor,
} from "@openpeeps/greenscreen";
import { LocalAudioTrack, type Room, Track } from "livekit-client";
import { uuidv7 } from "uuidv7";
import type { addEventMutation } from "$lib/api";
import type { MetadataType } from "$lib/types";
import { defaultRoomOptions } from "./constants";
import { addOwnReaction, mediaPermissionsStore } from "./stores";
import type { MediaPermissions } from "./types";

const encoder = new TextEncoder();

const updateMediaPermissions = async (
	permission: Partial<MediaPermissions>,
	state = false,
) => {
	const update = (permission: Partial<MediaPermissions>) => {
		mediaPermissionsStore.update((perms) => ({
			...perms,
			permission,
		}));
	};
	if (state) {
		try {
			const permState = await navigator.permissions.query({
				name: "camera" as PermissionName,
			});
			if (permState?.state === "denied") {
				update(permission);
				return { denied: true };
			}
		} catch { }
	} else {
		update(permission);
	}
	return { denied: false };
};

export const createVideoStream = async (
	deviceId: string | undefined,
	jam: Jam,
	jamSettings?: JamSettings,
) => {
	try {
		const originalStream = await navigator.mediaDevices.getUserMedia({
			video: {
				...defaultRoomOptions[jam.type].videoCaptureDefaults,
				deviceId,
			},
		});
		await updateMediaPermissions({
			camera: true,
			lastDenied: { camera: false },
		});

		switch (jamSettings?.backgroundObfuscation?.type) {
			case "video":
				return transformStream(
					originalStream,
					await videoProcessor(jamSettings.backgroundObfuscation.video),
				);
			case "image":
				return transformStream(
					originalStream,
					await imageProcessor(jamSettings.backgroundObfuscation.image),
				);
			case "blur":
				return transformStream(
					originalStream,
					blurProcessor(jamSettings.backgroundObfuscation.radius),
				);
			default:
				return originalStream;
		}
	} catch {
		await updateMediaPermissions({
			camera: false,
			lastDenied: { camera: true },
		});
	}
};

const publishCameraTrack = async (
	room: Room,
	deviceId: string | undefined,
	jam: Jam,
	jamSettings: JamSettings | undefined,
) => {
	const stream = await createVideoStream(deviceId, jam, jamSettings);

	await room.localParticipant.publishTrack(stream?.getVideoTracks()[0]!, {
		source: Track.Source.Camera,
	});
};

export const switchCamera = async (
	room: Room,
	deviceId: string | undefined,
	jam: Jam,
	jamSettings: JamSettings | undefined,
) => {
	const currentCameraTrack = [
		...room.localParticipant.videoTrackPublications.values(),
	].filter((vtp) => vtp.videoTrack?.source === Track.Source.Camera)[0]?.track;

	if ((await currentCameraTrack?.getDeviceId()) === deviceId) {
		return;
	}

	if (currentCameraTrack) {
		await room.localParticipant.unpublishTrack(currentCameraTrack);
	}

	await publishCameraTrack(room, deviceId, jam, jamSettings);
};

export const switchBackground = async (
	room: Room,
	jam: Jam,
	jamSettings: JamSettings | undefined,
) => {
	const currentCameraTrack = [
		...room.localParticipant.videoTrackPublications.values(),
	].filter((vtp) => vtp.videoTrack?.source === Track.Source.Camera)[0]?.track;

	const deviceId = await currentCameraTrack?.getDeviceId();

	if (currentCameraTrack) {
		await room.localParticipant.unpublishTrack(currentCameraTrack);
	}

	await publishCameraTrack(room, deviceId, jam, jamSettings);
};

export const createLocalAudioTrack = async (deviceId: string) => {
	const mediaStream = await navigator.mediaDevices.getUserMedia({
		audio: {
			deviceId: { exact: deviceId },
		},
	});
	return new LocalAudioTrack(mediaStream.getAudioTracks()[0]);
};

export const switchMicrophone = async (room: Room, deviceId?: string) => {
	const currentMicrophoneTrack = [
		...room.localParticipant.audioTrackPublications.values(),
	].filter((tp) => tp.audioTrack?.source === Track.Source.Microphone)[0]?.track;

	if ((await currentMicrophoneTrack?.getDeviceId()) === deviceId) {
		return;
	}

	if (currentMicrophoneTrack) {
		await room.localParticipant.unpublishTrack(currentMicrophoneTrack);
	}

	if (deviceId) {
		await room.localParticipant.publishTrack(await createLocalAudioTrack(deviceId), {
			source: Track.Source.Microphone,
		});
	}

};

export const toggleCamera = async (
	room: Room,
	deviceId: string | undefined,
	jam: Jam,
	jamSettings: JamSettings | undefined,
) => {
	try {
		const { denied } = await updateMediaPermissions(
			{ camera: false, lastDenied: { camera: true } },
			true,
		);
		if (denied) return;

		const currentCameraTrack = [
			...room.localParticipant.videoTrackPublications.values(),
		].filter((vtp) => vtp.videoTrack?.source === Track.Source.Camera)[0]?.track;

		if (currentCameraTrack) {
			await room.localParticipant.unpublishTrack(currentCameraTrack);
			await updateMediaPermissions({ camera: false });
		} else {
			await publishCameraTrack(room, deviceId, jam, jamSettings);
			await updateMediaPermissions({
				camera: true,
				lastDenied: { camera: false },
			});
		}
	} catch {
		await updateMediaPermissions({
			camera: false,
			lastDenied: { camera: true },
		});
	}
};

export const toggleMicrophone = async (room: Room) => {
	try {
		const { denied } = await updateMediaPermissions(
			{ microphone: false, lastDenied: { microphone: true } },
			true,
		);
		if (denied) return;
		await room.localParticipant.setMicrophoneEnabled(
			!room.localParticipant.isMicrophoneEnabled,
		);
		await updateMediaPermissions({
			microphone: room.localParticipant.isMicrophoneEnabled,
			lastDenied: { microphone: false },
		});
	} catch {
		await updateMediaPermissions({
			microphone: false,
			lastDenied: { microphone: true },
		});
	}
};

export const toggleSpeaker = async (previousState: boolean) => {
	try {
		if (previousState) {
			await updateMediaPermissions({ speaker: false });
		} else {
			await updateMediaPermissions({
				speaker: true,
				lastDenied: { speaker: false },
			});
		}
	} catch {
		await updateMediaPermissions({
			speaker: false,
			lastDenied: { speaker: true },
		});
	}
};


export const toggleHand = (room: Room) => {
	const oldMetadata = JSON.parse(room.localParticipant.metadata || "{}");
	const newMetadata: MetadataType = {
		...oldMetadata,
		handRaised: oldMetadata?.handRaised !== undefined ? undefined : new Date(),
	};

	return room.localParticipant.setMetadata(JSON.stringify(newMetadata));
};

export const sendJamEvent = async (
	room: Room,
	addEvent: ReturnType<typeof addEventMutation>,
	type: JamEvent["type"],
	content: JamEvent["content"],
): Promise<JamEvent> => {
	const metadata = JSON.parse(room.localParticipant.metadata || "{}") as MetadataType;
	const newEvent = {
		id: uuidv7(),
		type,
		jamId: room.name,
		content,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		profileId: metadata?.profile.id,
		sender: {
			participantId: room.localParticipant.identity,
			profile: metadata?.profile as PublicProfile,
		},
	};
	const serializedEvent = JSON.stringify(newEvent);
	const encodedMessages = encoder.encode(serializedEvent);
	await addEvent(newEvent, { id: room.name || "" });
	await room.localParticipant.publishData(encodedMessages, {
		reliable: false,
	});
	return newEvent;
};

const persistReactionAsync = async (
	event: JamEvent,
	addEvent: ReturnType<typeof addEventMutation>,
) => {
	await addEvent(event, { id: event.jamId || "" });
};

export const sendReaction = async (
	room: Room,
	emoji: string,
	addEvent: ReturnType<typeof addEventMutation>,
) => {
	const metadata = JSON.parse(room.localParticipant.metadata || "{}") as MetadataType;
	const newEvent: JamEvent = {
		id: uuidv7(),
		type: "reaction",
		jamId: room.name,
		content: emoji,
		createdAt: new Date().toISOString(),
		updatedAt: new Date().toISOString(),
		profileId: metadata.profile?.id,
	};

	const serializedEvent = JSON.stringify(newEvent);
	const encodedMessages = encoder.encode(serializedEvent);
	await room.localParticipant.publishData(encodedMessages, {
		reliable: false,
		topic: "reactions",
	});

	addOwnReaction(newEvent);

	persistReactionAsync(newEvent, addEvent);
};

export const sendAttendance = async (
	room: Room,
	type: "join" | "leave",
	addEvent: ReturnType<typeof addEventMutation>,
) =>
	sendJamEvent(room, addEvent, type, type === "join" ? "👋" : "🚶🏾");

export const toggleScreenShare = async (room: Room) =>
	room.localParticipant.setScreenShareEnabled(
		!room.localParticipant.isScreenShareEnabled,
		{
			audio: true,
		}
	);
