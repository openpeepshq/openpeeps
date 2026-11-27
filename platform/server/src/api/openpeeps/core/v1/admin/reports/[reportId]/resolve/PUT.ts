import { endpoint, z } from '#lib/endpoint';
import {
  reportResolutionSchema,
  successResponseSchema,
} from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { auditAction } from '#lib/audit';
import { findReport, resolveReport } from '@openpeepshq/core/reports';

export const Param = z.object({
  reportId: z.string(),
});

export const Output = successResponseSchema;

export const Input = z.object({
  resolution: reportResolutionSchema,
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Input, Output, Error }).handle(
  async (input, event) => {
    await ensureRoleCapabilities(event, ['core-reports-update']);

    const report = await findReport(input.reportId);
    if (!report) {
      throw notFound();
    }

    await resolveReport(report, input.resolution);

    if (event.context.currentProfile) {
      void auditAction(event, event.context.currentProfile, {
        action: 'report.resolve',
        targetType: 'report',
        targetId: input.reportId,
        targetLabel: report.reportedProfile?.handle,
        metadata: {
          resolution: input.resolution,
          reportedProfileId: report.reportedProfile?.id,
        },
      });
    }

    return { success: true };
  },
);
