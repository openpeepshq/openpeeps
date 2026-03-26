import { getContext, setContext } from 'svelte';
import {
	type Event,
	type Jam,
	type JamEvent,
	jamEventSchema,
	type PublicPost
} from '@openpeeps/common/types';
import { jamFromEvent } from '@openpeeps/common/lib';
import { type ConnectionQuality, ParticipantEvent, type Room, RoomEvent } from 'livekit-client';
import { type Writable, writable } from 'svelte/store';
import { addEventMutation, infiniteJamEventsStore, waitingRoom } from '$lib/api';
import type { JamChatContext, JamContext } from '$lib/types';
import { sendJamEvent } from '$lib/components/core/jams/actions';
import { getCurrentProfile } from '$lib/auth';

export const getJamContext = () => getContext<JamContext>('jam');
export const setJamContext = (jamPost: PublicPost) => {
	const jam = jamFromEvent(jamPost) as Jam;
	const jamEvent = jamPost.data as Event;
	setContext('jam', { jam, jamEvent, jamPost });
};

export const getLivekitRoom = () => getContext<Room>('jam-livekit-room');
export const setLivekitRoom = (room: Room) => setContext('jam-livekit-room', room);

export const getWaitingRoom = () => getContext<ReturnType<typeof waitingRoom>>('jam-waiting-room');
export const setWaitingRoom = (jamEvent: PublicPost) => {
	const me = getCurrentProfile();
	const jam = jamFromEvent(jamEvent);
	me &&
		setContext(
			'jam-waiting-room',
			jam?.waitingRoom && jam?.moderators.includes(me.id) ? waitingRoom(jamEvent.id) : undefined
		);
};

export const initPopupMenuContext = () =>
	setContext('jam-popup-menu-open', writable<string | undefined>());
export const getPopupMenuContext = () => getContext('jam-popup-menu-open');

export const initDrawerContext = () =>
	setContext('jam-drawer-open', writable<'chat' | 'debug' | 'people' | 'info' | undefined>());
export const getDrawerContext = () => getContext<Writable<string | undefined>>('jam-drawer-open');

const decoder = new TextDecoder();
export const getChatContext = () => getContext<JamChatContext>('jam-chat-context');
export const initChatContext = () => {
	const sessionEvents = writable<JamEvent[]>([]);
	const room = getLivekitRoom();

	const infiniteJamEventsQuery = infiniteJamEventsStore({
		id: room.name || '',
		limit: 100
	});
	const addEvent = addEventMutation();

	room.on(RoomEvent.DataReceived, (payload: Uint8Array) => {
		const receivedPacket = decoder.decode(payload);
		const jamEvent = jamEventSchema.parse(JSON.parse(receivedPacket)) as JamEvent;
		sessionEvents.update((events) => [...events, jamEvent]);
	});

	return setContext<JamChatContext>('jam-chat-context', {
		sessionEvents,
		sendMessage: async (message: string) => {
			const event = await sendJamEvent(room, addEvent, 'message', message);
			sessionEvents.update((events) => [...events, event]);
		},
		query: infiniteJamEventsQuery
	});
};

export const networkQuality = writable<ConnectionQuality>();
export const initNetworkContext = () => {
	const room = getLivekitRoom();

	room.on(RoomEvent.ConnectionQualityChanged, (quality, participant) => {
		if (participant.isLocal) {
			networkQuality.set(quality);
		}
	});

	room.localParticipant.on(ParticipantEvent.ConnectionQualityChanged, (quality) => {
		networkQuality.set(quality);
	});
};

export const jamRoles = () => {
	const { jam } = getJamContext();
	const room = getLivekitRoom();

	return {
		iAmModerator: jam.moderators.includes(room.localParticipant.identity)
	};
};

export const observerContext = () =>
	getContext<boolean>('jam-observer');
export const setObserverContext = (observer: boolean) => setContext('jam-observer', observer);

