import { Endpoint, z } from 'sveltekit-api';
import type { RequestEvent } from '@sveltejs/kit';
import { parseISO } from 'date-fns/parseISO';
import { forbidden } from '$lib/server/api/errors';
import { ensureRoleCapabilities } from '$lib/server/auth';
import { listLogs } from '@openpeeps/core/log';

export const Query = z.object({
  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/)
    .optional(),
});

export const Output = z
  .object({
    level: z.string(),
    message: z.string(),
    timestamp: z.string(),
    meta: z.any().optional(),
    namespace: z.string(),
  })
  .array();
export const Error = {
  403: forbidden(),
};

export default new Endpoint({ Error, Output, Query }).handle(
  async (query, event: RequestEvent) => {
    await ensureRoleCapabilities(event, ['core-logs-read']);
    const date = query.date ? parseISO(query.date) : new Date();
    return listLogs(date);
  },
);
