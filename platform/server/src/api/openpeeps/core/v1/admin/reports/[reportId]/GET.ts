import { findReport } from "@openpeepshq/core/reports";
import { endpoint, z } from '#lib/endpoint';
import { reportWithMetaSchema } from "@openpeepshq/common";
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';

export const Output = reportWithMetaSchema;
export const Param = z.object({
    reportId: z.string(),
});
export const Error = {
    404: notFound(),
    403: forbidden(),
};


export const apiEndpoint = endpoint({ Output, Param, Error }).handle(async (input, event) => {

    await ensureRoleCapabilities(event, ['core-reports-read']);

    const report = await findReport(input.reportId);
    if (!report) {
        throw notFound();
    }

    return report;
});
