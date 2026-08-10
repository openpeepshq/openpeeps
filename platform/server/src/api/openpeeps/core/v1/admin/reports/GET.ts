import { ensureRoleCapabilities } from '#lib/auth';
import { reportWithMetaSchema } from "@openpeepshq/common";
import { listReports } from "@openpeepshq/core/reports";
import { endpoint } from '#lib/endpoint';

export const Output = reportWithMetaSchema.array();

export const apiEndpoint = endpoint({ Output }).handle(async (_, event) => {
  await ensureRoleCapabilities(event, ['core-reports-read']);
  return listReports();
});
