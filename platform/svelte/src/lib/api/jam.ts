import { writable } from 'svelte/store';
import type { ChronologicalInfiniteQueryParams } from '@openpeeps/common/types';
import { payloadMutation, noPayloadMutation, client, noPayloadStream, infiniteChronologicalStore } from './helpers';
import { simpleStore } from './helpers';

export const closeJamMutation = noPayloadMutation(client.jams.close);

export const joinJamMutation = noPayloadMutation(client.jams.token);

export const jamListStore = () => simpleStore(client.jams.list);

export const jamStateStore = (id: string) =>
	simpleStore(client.jams.state, { pathParams: { id }, refetchInterval: 10000 });

export const liveJamsListStore = () =>
	simpleStore(client.jams.list, {
		queryParams: { live: 'true' },
		refetchInterval: 10000
	});

export const muteJamParticipantMutation = payloadMutation(client.jams.muteParticipant);

export const jamEventsStore = (id: string) =>
	simpleStore(client.jams.events.list, { pathParams: { id } });
export const infiniteJamEventsStore = ({ id, ...props }: ChronologicalInfiniteQueryParams & { id: string }) =>
	infiniteChronologicalStore(client.jams.events.list, { pathParams: { id }, queryParams: props });

export const jamActivityStore = writable<
	{
		activity: string;
		timestamp: string;
	}[]
>([]);

export const addEventMutation = payloadMutation(client.jams.events.create, {
	queryKeys: [['jams']]
});

export const jamAttendanceStore = (id: string) =>
	simpleStore(client.jams.events.attendance, { pathParams: { id } });

export const waitingRoom = (id: string) =>
	noPayloadStream(client.jams.waitingRoom.listen).last({
		pathParameters: { id }
	});

export const admitMutation = noPayloadMutation(client.jams.waitingRoom.admit);

export const joinRequest = (id: string) =>
	noPayloadStream(client.jams.waitingRoom.join).last({ pathParameters: { id } });

export const startRecordingMutation = noPayloadMutation(client.jams.recordings.start);
export const stopRecordingMutation = noPayloadMutation(client.jams.recordings.stop);
export const observerLinkStore = (id: string) => simpleStore(client.jams.recordings.observerLink, { pathParams: {id} });