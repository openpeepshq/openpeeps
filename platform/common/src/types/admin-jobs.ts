import { z } from 'zod';

export const adminJobDetailSchema = z.object({
  queue: z.string(),
  id: z.string(),
  name: z.string(),
  state: z.string(),
  failedReason: z.string().nullable(),
  finishedOn: z.number().nullable(),
  processedOn: z.number().nullable(),
  timestamp: z.number().nullable(),
  data: z.unknown().nullable(),
  logs: z.array(z.string()),
  logCount: z.number(),
});

export type AdminJobDetail = z.infer<typeof adminJobDetailSchema>;
