import { client, simpleStore } from '../helpers';

export const jobDetailStore = (queue: string, jobId: string) =>
  simpleStore(client.admin.diagnostics.jobs.jobDetail, {
    pathParams: { queue, jobId },
  });
