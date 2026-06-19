import { PostWithMeta, ReportData, ReportResolution, ReportWithMeta } from "@openpeeps/common/types";
import { ProfileWithMeta } from "@openpeeps/common/types";
import { allpeepDb } from "../db";
import { reportsMapping } from "./mapping";
import {
    createdReportConnector,
    reportedPostsConnector,
    reportedProfileConnector,
    transformReport,
} from "./helpers";
import { throwIfUndefined } from "../lib/utils";

export const createReport = async (
    reportData: ReportData,
    reporter: ProfileWithMeta,
    reportedProfile: ProfileWithMeta,
    reportedPosts: PostWithMeta[]) => {
    const { db } = await allpeepDb();
    const report = await reportsMapping.create(db, reportData);
    await createdReportConnector(db, reporter, report);
    await reportedProfileConnector(db, report, reportedProfile);
    await Promise.all(reportedPosts.map(post => reportedPostsConnector(db, report, post)));
    return throwIfUndefined(
        await reportsMapping
            .find(db, report.id)
            .then((loaded) => (loaded ? transformReport(loaded) : undefined)),
    );
}

export const resolveReport = async (report: ReportWithMeta, resolution: ReportResolution) =>
    allpeepDb().then(({ db }) => reportsMapping.update(db, report.id, { resolution }));

export const reopenReport = async (report: ReportWithMeta) =>
    allpeepDb().then(({ db }) => reportsMapping.update(db, report.id, { resolution: undefined }));