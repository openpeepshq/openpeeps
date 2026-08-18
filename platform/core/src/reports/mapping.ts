import { ReportData, ReportWithMeta } from '@openpeepshq/common/types';
import { collectionInfos } from '../db';
import { postsMapping } from '../posts/mapping';
import { profilesMapping } from '../profiles/mapping';
import { map, Relation } from '../db/pg/map';

// Keep reporter/reported profiles even after the account is soft-deleted so
// historical reports still resolve (and serialize) — `transformReport`
// tombstones the deleted profile. Without this the relation resolves to
// `undefined`, fails output validation, and blanks the whole moderation queue.
const reportRelations: Relation[] = [
  {
    alias: 'reporterProfile',
    edgeCollection: collectionInfos.createdReportCollection.name,
    direction: 'INBOUND',
    cardinality: 'one',
    mapping: profilesMapping.ignoreSoftDelete().data(),
    skipEdge: true,
  },
  {
    alias: 'reportedProfile',
    edgeCollection: collectionInfos.isReportedProfileCollection.name,
    direction: 'OUTBOUND',
    cardinality: 'one',
    mapping: profilesMapping.ignoreSoftDelete().data(),
    skipEdge: true,
  },
  {
    alias: 'reportedPosts',
    edgeCollection: collectionInfos.isReportedObjectCollection.name,
    direction: 'OUTBOUND',
    cardinality: 'many',
    mapping: postsMapping.data(),
    skipEdge: true,
  },
];

export const reportsMapping = map<ReportData, ReportWithMeta>({
  collection: collectionInfos.reportsCollection.name,
  relations: reportRelations,
});
