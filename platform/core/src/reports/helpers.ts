import { eq } from 'drizzle-orm';
import { connector } from '../db/helpers';
import { allpeepDb, collectionInfos } from '../db';
import {
  createdReport as createdReportEdge,
  isReportedProfile as isReportedProfileEdge,
} from '../db/pg/schema/edges';
import {
  DbPost,
  PostWithMeta,
  ReportWithMeta,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import {
  deletedProfileWithMeta,
  tombstoneProfileWithMetaIfDeleted,
} from '@openpeepshq/common/lib';
import { transformPost } from '../posts';

/**
 * The reporter/reported profile relations resolve to `undefined` when the
 * profile has been **hard** deleted (row physically gone). Soft-deleted rows
 * still resolve and are handled by `tombstoneProfileWithMetaIfDeleted`. The
 * report edges outlive the profile row — profile deletion never purges the
 * report graph — so the profile id can be recovered from the edge row itself
 * and a tombstone synthesized from it.
 */
const hardDeletedProfileFromEdge = async (
  reportId: string,
  edgeTable: typeof createdReportEdge | typeof isReportedProfileEdge,
  profileIdColumn: 'fromId' | 'toId',
  reportIdColumn: 'fromId' | 'toId',
): Promise<ProfileWithMeta | undefined> => {
  const { db } = await allpeepDb();
  const rows = await db
    .select({
      profileId: edgeTable[profileIdColumn] as never as never,
    })
    .from(edgeTable)
    .where(eq(edgeTable[reportIdColumn] as never as never, reportId))
    .limit(1);
  return deletedProfileWithMeta(rows[0]?.profileId);
};

export const transformReport = async (
  report: ReportWithMeta,
): Promise<ReportWithMeta> => {
  const rawPosts = (report.reportedPosts ?? []) as unknown as DbPost[];

  // A profile relation is `undefined` only when the account was hard-deleted
  // (soft-deleted rows still resolve). Recover the id from the surviving edge
  // and synthesize a tombstone; otherwise tombstone soft-deleted rows.
  // Reporter is the `from` side of created_report (profiles -> reports); the
  // reported profile is the `to` side of is_reported_profile (reports -> profiles).
  const reporterProfile =
    report.reporterProfile === undefined
      ? await hardDeletedProfileFromEdge(
          report.id,
          createdReportEdge,
          'fromId',
          'toId',
        )
      : tombstoneProfileWithMetaIfDeleted(report.reporterProfile);
  const reportedProfile =
    report.reportedProfile === undefined
      ? await hardDeletedProfileFromEdge(
          report.id,
          isReportedProfileEdge,
          'toId',
          'fromId',
        )
      : tombstoneProfileWithMetaIfDeleted(report.reportedProfile);

  return {
    ...report,
    reporterProfile: reporterProfile as ProfileWithMeta,
    reportedProfile: reportedProfile as ProfileWithMeta,
    reportedPosts: await Promise.all(
      rawPosts.map((post) => transformPost(post)),
    ),
  };
};

export const transformReports = async (
  reports: ReportWithMeta[],
): Promise<ReportWithMeta[]> => Promise.all(reports.map(transformReport));

export const createdReportConnector = connector<
  ProfileWithMeta,
  ReportWithMeta
>(
  collectionInfos.profilesCollection,
  collectionInfos.reportsCollection,
  collectionInfos.createdReportCollection,
);

export const reportedProfileConnector = connector<
  ReportWithMeta,
  ProfileWithMeta
>(
  collectionInfos.reportsCollection,
  collectionInfos.profilesCollection,
  collectionInfos.isReportedProfileCollection,
);

export const reportedPostsConnector = connector<ReportWithMeta, PostWithMeta>(
  collectionInfos.reportsCollection,
  collectionInfos.postsCollection,
  collectionInfos.isReportedObjectCollection,
);
