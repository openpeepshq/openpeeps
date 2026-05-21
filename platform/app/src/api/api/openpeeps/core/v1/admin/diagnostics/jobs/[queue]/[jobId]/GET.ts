import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { adminJobDetailSchema } from '@openpeeps/common/types';
import { forbidden, notFound } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { getJobDetail } from '@openpeeps/core/jobs';

export const Output = adminJobDetailSchema;

export const Param = z.object({
  queue: z.string(),
  jobId: z.string(),
});

export const Error = {
  403: forbidden(),
  404: notFound(),
};

export default new Endpoint({ Output, Param, Error }).handle(
  async (input, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-config-read']);

    const job = await getJobDetail(input.queue, input.jobId);
    if (!job) {
      throw notFound();
    }

    return job;
  },
);
