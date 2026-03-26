import { map, RelationWithMapping } from "@openpeeps/arango-querybuilder";
import { collectionInfos } from "../db";
import { JamEvent, JamEventData, JamRecording, JamRecordingData, PostWithMeta } from "@openpeeps/common/types";
import { EdgeMetadata } from "arangojs/documents";

export const jamEventsMapping = map<JamEventData, JamEvent>({
    collection: collectionInfos.jamEventsCollection.name,
});

export const jamSessionStartsMapping = jamEventsMapping.filter({
    matches: {
        type: 'start',
    }
});

export const jamSessionClosesMapping = jamEventsMapping.filter({
    matches: {
        type: 'close',
    }
});

export const jamParticipantsMapping = jamEventsMapping.filter({
    matches: {
        type: 'join',
    }
});

export const jamRecordingRelation: RelationWithMapping<PostWithMeta, JamRecording> = {
    alias: 'profile',
    edgeCollection: 'jamRecordings',
    direction: 'INBOUND',
    skipEdge: false,
    cardinality: 'many',
    mapping: {
        collection: 'profiles',
        softDelete: true,
    },
};

export const jamRecordingsMapping = map<JamRecordingData, JamRecording & EdgeMetadata>({
    collection: 'jamRecordings',
    keepMetadata: true,
});