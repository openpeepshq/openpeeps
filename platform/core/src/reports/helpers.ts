import { connector } from "../db/helpers";
import { collectionInfos } from "../db/structure";
import {
    DbPost,
    PostWithMeta,
    ReportWithMeta,
    ProfileWithMeta,
} from "@openpeeps/common/types";
import { transformPost } from "../posts";

export const transformReport = async (
    report: ReportWithMeta,
): Promise<ReportWithMeta> => {
    const rawPosts = report.reportedPosts as unknown as DbPost[];
    return {
        ...report,
        reportedPosts: await Promise.all(
            rawPosts.map((post) => transformPost(post)),
        ),
    };
};

export const transformReports = async (
    reports: ReportWithMeta[],
): Promise<ReportWithMeta[]> =>
    Promise.all(reports.map(transformReport));

export const createdReportConnector = connector<ProfileWithMeta, ReportWithMeta>(
    collectionInfos.profilesCollection,
    collectionInfos.reportsCollection,
    collectionInfos.createdReportCollection,
);

export const reportedProfileConnector = connector<ReportWithMeta, ProfileWithMeta>(
    collectionInfos.reportsCollection,
    collectionInfos.profilesCollection,
    collectionInfos.isReportedProfileCollection,
);

export const reportedPostsConnector = connector<ReportWithMeta, PostWithMeta>(
    collectionInfos.reportsCollection,
    collectionInfos.postsCollection,
    collectionInfos.isReportedObjectCollection,
);