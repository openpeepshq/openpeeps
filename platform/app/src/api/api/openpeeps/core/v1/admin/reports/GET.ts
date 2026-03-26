import { ensureRoleCapabilities } from "$lib/server/auth";
import { reportWithMetaSchema } from "@openpeeps/common";
import { listReports } from "@openpeeps/core/reports";
import { Endpoint } from "sveltekit-api";

export const Output = reportWithMetaSchema.array();

export default new Endpoint({ Output }).handle(async (_, event) => {
  await ensureRoleCapabilities(event, ['core-reports-read']);
  return listReports();
});
