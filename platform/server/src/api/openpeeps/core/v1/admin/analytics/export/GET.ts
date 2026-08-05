import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { forbidden } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { analyticsDateQuerySchema } from '@openpeeps/common/types';
import {
  buildAnalyticsBoardReport,
  exportAnalyticsCsv,
} from '@openpeeps/core/analytics';

export const Query = analyticsDateQuerySchema.extend({
  format: z.enum(['csv', 'pdf']).optional().default('csv'),
});

export const Output = z.object({
  filename: z.string(),
  contentType: z.string(),
  content: z.string(),
  encoding: z.enum(['utf8', 'base64']),
});

export const Error = {
  403: forbidden(),
};

export const apiEndpoint = endpoint({ Query, Output, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-analytics-read']);
    const format = input.format ?? 'csv';
    const from = input.from ?? 'range';
    const to = input.to ?? 'export';

    if (format === 'pdf') {
      const { pdf, overview } = await buildAnalyticsBoardReport(input);
      return {
        filename: `analytics-${overview.range.from}-${overview.range.to}.pdf`,
        contentType: 'application/pdf',
        content: pdf.toString('base64'),
        encoding: 'base64' as const,
      };
    }

    const csv = await exportAnalyticsCsv(input);
    return {
      filename: `analytics-${from}-${to}.csv`,
      contentType: 'text/csv',
      content: csv,
      encoding: 'utf8' as const,
    };
  },
);
