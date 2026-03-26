import { differenceInMinutes } from "date-fns";
import { localParticipantMetadataSchema, type JamChatContext, type StoreValue } from "$lib/types";
import { getUniqueBy, type JamEvent } from "@openpeeps/common";
import type { Room } from "livekit-client";

export const isObserver = (room: Room) =>
    localParticipantMetadataSchema.parse(JSON.parse(room.localParticipant.metadata || '{}')).observer;

export const calculateRecordingState = (query: StoreValue<JamChatContext['query']>, sessionEvents: JamEvent[]) => {
    const events = getUniqueBy(
        [...(query?.data?.pages?.flat() || []), ...sessionEvents],
        (event) => event.id,
    ).sort(
        (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
    )
    const lastRecordingStart = events.find(event => event.type === 'recordStart');
    const lastRecordingStop = events.find(event => event.type === 'recordStop');
    const isRecording =
        lastRecordingStart &&
        (!lastRecordingStop || lastRecordingStart.createdAt > lastRecordingStop.createdAt) &&
        differenceInMinutes(Date.now(), new Date(lastRecordingStart.createdAt)) < 60;
    const recordingStart = isRecording ? lastRecordingStart.createdAt : undefined;
    return { isRecording, recordingStart };
}