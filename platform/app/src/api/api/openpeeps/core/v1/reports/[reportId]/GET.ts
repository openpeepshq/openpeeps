import { findReport } from "@openpeeps/core/reports";
import { Endpoint, z } from "sveltekit-api";
import { reportWithMetaSchema } from "@openpeeps/common";
import { forbidden, notFound } from "$lib/server/api/errors";
import { ensureLocalProfile } from "$lib/server/auth";

export const Output = reportWithMetaSchema;
export const Param = z.object({
    reportId: z.string(),
});
export const Error = {
    404: notFound(),
    403: forbidden(),
};


export default new Endpoint({ Output, Param, Error }).handle(async (input, event) => {

    const profile = await ensureLocalProfile(event);
    const report = await findReport(input.reportId);
    if (!report) {
        throw notFound();
    }


    return report;
});
