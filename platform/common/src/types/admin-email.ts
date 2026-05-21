import { z } from 'zod';

const transportOverrideSchema = z.object({
  host: z.string().optional(),
  port: z.number().optional(),
  secure: z.literal(true).optional(),
  auth: z
    .object({
      user: z.string().optional(),
      pass: z.string().optional(),
    })
    .optional(),
});

export const adminEmailTestInputSchema = z.object({
  to: z.string().email(),
  email: z
    .object({
      defaultFrom: z.string().optional(),
      transportConfig: transportOverrideSchema.optional(),
    })
    .optional(),
});

export type AdminEmailTestInput = z.infer<typeof adminEmailTestInputSchema>;

export const adminEmailQueueTestInputSchema = z.object({
  to: z.string().email(),
});

export type AdminEmailQueueTestInput = z.infer<
  typeof adminEmailQueueTestInputSchema
>;

export const adminEmailQueueStatsSchema = z.object({
  counts: z.object({
    waiting: z.number(),
    active: z.number(),
    completed: z.number(),
    failed: z.number(),
    delayed: z.number(),
    prioritized: z.number(),
  }),
  recentFailures: z.array(
    z.object({
      queue: z.string(),
      id: z.string().nullable(),
      name: z.string(),
      failedReason: z.string(),
      finishedOn: z.number().nullable(),
    }),
  ),
});

export type AdminEmailQueueStats = z.infer<typeof adminEmailQueueStatsSchema>;
