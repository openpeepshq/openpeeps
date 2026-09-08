import { z } from 'zod';

const bytesSchema = z.number().nonnegative();

export const adminServerStatusSchema = z.object({
  version: z.string(),
  build: z.string().nullable(),
  environment: z.string(),
  startedAt: z.iso.datetime(),
  uptimeSeconds: z.number().nonnegative(),
  subscription: z.object({
    plan: z.string().nullable(),
    maxProfiles: z.number().int().positive().nullable(),
    profileCount: z.number().int().nonnegative(),
    accountCount: z.number().int().nonnegative(),
  }),
  resources: z.object({
    processMemory: z.object({
      rssBytes: bytesSchema,
      heapUsedBytes: bytesSchema,
      heapTotalBytes: bytesSchema,
    }),
    systemMemory: z.object({
      totalBytes: bytesSchema,
      freeBytes: bytesSchema,
    }),
    loadAverage: z.tuple([z.number(), z.number(), z.number()]),
    disk: z
      .object({
        path: z.string(),
        totalBytes: bytesSchema,
        freeBytes: bytesSchema,
      })
      .nullable(),
  }),
});

export type AdminServerStatus = z.infer<typeof adminServerStatusSchema>;
