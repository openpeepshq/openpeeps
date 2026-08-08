import { z } from 'zod';

export const slowRequestRecordSchema = z.object({
  method: z.string(),
  path: z.string(),
  status: z.number(),
  durationMs: z.number(),
  at: z.string(),
  hostname: z.string().optional(),
});

export type SlowRequestRecord = z.infer<typeof slowRequestRecordSchema>;

export const adminPerformanceStatsSchema = z.object({
  slowRequestMs: z.number(),
  dbTimingEnabled: z.boolean(),
  slowRequests: z.array(slowRequestRecordSchema),
});

export type AdminPerformanceStats = z.infer<typeof adminPerformanceStatsSchema>;
