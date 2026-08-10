import { endpoint, z } from '#lib/endpoint';
import { successResponseSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { findReport, reopenReport } from "@openpeepshq/core/reports";

export const Param = z.object({
  reportId: z.string(),
});

export const Output = successResponseSchema;

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-reports-update']);

    const report = await findReport(input.reportId);
    if (!report) {
      throw notFound();
    }

    await reopenReport(report)


    return { success: true };
  },
);
