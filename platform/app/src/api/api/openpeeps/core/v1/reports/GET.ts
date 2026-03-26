import { ensureLocalProfile } from "$lib/server/auth";
import { listReportsByReporterProfile } from "@openpeeps/core/reports";
import { Endpoint } from "sveltekit-api";
import { reportWithMetaSchema } from "@openpeeps/common";
export const Output = reportWithMetaSchema.array();

export default new Endpoint({ Output }).handle(async (_, event) => {
    const profile = await ensureLocalProfile(event);
    return listReportsByReporterProfile(profile);
});
