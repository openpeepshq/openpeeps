import { connector } from "../db/helpers";
import { collectionInfos } from "../db/structure";
import { PostWithMeta, ReportWithMeta } from "@openpeeps/common/types";
import { ProfileWithMeta } from "@openpeeps/common/types";

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