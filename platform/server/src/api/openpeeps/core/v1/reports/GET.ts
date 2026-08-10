import { ensureLocalProfile } from '#lib/auth';
import { listReportsByReporterProfile } from "@openpeepshq/core/reports";
import { endpoint } from '#lib/endpoint';
import { reportWithMetaSchema } from "@openpeepshq/common";
export const Output = reportWithMetaSchema.array();

export const apiEndpoint = endpoint({ Output }).handle(async (_, event) => {
    const profile = await ensureLocalProfile(event);
    return listReportsByReporterProfile(profile);
});
