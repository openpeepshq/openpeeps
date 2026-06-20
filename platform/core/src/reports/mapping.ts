import { Report, ReportData, ReportWithMeta } from '@openpeeps/common/types';
import { collectionInfos } from '../db/structure';
import { postsMapping } from '../posts/mapping';
import { profilesMapping } from '../profiles/mapping';
import { map, Relation } from '../db/pg/map';

const reportRelations: Relation[] = [
  {
    alias: 'reporterProfile',
    edgeCollection: collectionInfos.createdReportCollection.name,
    direction: 'INBOUND',
    cardinality: 'one',
    mapping: profilesMapping.data(),
    skipEdge: true,
  },
  {
    alias: 'reportedProfile',
    edgeCollection: collectionInfos.isReportedProfileCollection.name,
    direction: 'OUTBOUND',
    cardinality: 'one',
    mapping: profilesMapping.data(),
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
