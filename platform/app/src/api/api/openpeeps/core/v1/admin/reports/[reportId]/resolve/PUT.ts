import { Endpoint, z } from 'sveltekit-api';
import { reportResolutionSchema, successResponseSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { findReport, resolveReport } from "@openpeeps/core/reports";

export const Param = z.object({
  reportId: z.string(),
});

export const Output = successResponseSchema;

export const Input = z.object({
  resolution: reportResolutionSchema
})

export const Error = {
  403: forbidden(),
  404: notFound(),
};



export default new Endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-reports-update']);

    const report = await findReport(input.reportId);
    if (!report) {
      throw notFound();
    }

    await resolveReport(report, input.resolution)


    return { success: true };
  },
);
