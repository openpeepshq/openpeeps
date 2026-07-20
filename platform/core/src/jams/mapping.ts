import { map, RelationWithMapping } from '../db/pg/map';
import { collectionInfos } from '../db';
import {
  JamEvent,
  JamEventData,
  JamRecording,
  JamRecordingData,
  PostWithMeta,
} from '@openpeeps/common/types';

type EdgeMetadata = {
  _from: string;
  _to: string;
};

export const jamEventsMapping = map<JamEventData, JamEvent>({
  collection: collectionInfos.jamEventsCollection.name,
});

export const jamSessionStartsMapping = jamEventsMapping.filter({
  matches: {
    type: 'start',
  },
});

export const jamSessionClosesMapping = jamEventsMapping.filter({
  matches: {
    type: 'close',
  },
});

export const jamParticipantsMapping = jamEventsMapping.filter({
  matches: {
    type: 'join',
  },
});

export const jamRecordingRelation: RelationWithMapping<
  PostWithMeta,
  JamRecording
> = {
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

export const jamRecordingsMapping = map<
  JamRecordingData,
  JamRecording & EdgeMetadata
>({
  collection: 'jamRecordings',
  keepMetadata: true,
});
