import { PostWithMeta, Profile, ReportWithMeta } from "@openpeeps/common/types";
import { allpeepDb, collectionInfos } from "../db";
import { reportsMapping } from "./mapping";
import { profilesMapping } from "../profiles/mapping";
import { postsMapping } from "../posts";

export const findReport = async (id: string): Promise<ReportWithMeta | undefined> =>
    allpeepDb().then(({ db }) => reportsMapping.find(db, id));

export const listReports = async (): Promise<ReportWithMeta[]> =>
    allpeepDb().then(({ db }) => reportsMapping.all(db));

export const listReportsByReporterProfile = async (profile: Profile): Promise<ReportWithMeta[]> =>
    allpeepDb().then(({ db }) => profilesMapping.relationsFrom(profile, {
        alias: 'createdReport',
        edgeCollection: collectionInfos.createdReportCollection.name,
        direction: 'OUTBOUND',
        cardinality: 'many',
        mapping: reportsMapping.data(),
    }).all(db));

export const listReportsByReportedProfile = async (profile: Profile): Promise<ReportWithMeta[]> =>
    allpeepDb().then(({ db }) => profilesMapping.relationsFrom(profile, {
        alias: 'reportedProfile',
        edgeCollection: collectionInfos.isReportedProfileCollection.name,
        direction: 'INBOUND',
        cardinality: 'many',
        mapping: reportsMapping.data(),
    }).all(db));

export const listReportsByReportedPost = async (post: PostWithMeta): Promise<ReportWithMeta[]> =>
    allpeepDb().then(({ db }) => postsMapping.relationsFrom(post, {
        alias: 'reportedPosts',
        edgeCollection: collectionInfos.isReportedObjectCollection.name,
        direction: 'INBOUND',
        cardinality: 'many',
        mapping: reportsMapping.data(),
    }).all(db));