import { endpoint, z } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { adminJobDetailSchema } from '@openpeepshq/common/types';
import { forbidden, notFound } from '#lib/errors';
import { ensureRoleCapabilities } from '#lib/auth';
import { getJobDetail } from '@openpeepshq/core/jobs';

export const Output = adminJobDetailSchema;

export const Param = z.object({
  queue: z.string(),
  jobId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export const apiEndpoint = endpoint({ Output, Param, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-read']);

    const job = await getJobDetail(input.queue, input.jobId);
    if (!job) {
      throw notFound();
    }

    return job;
  },
);
