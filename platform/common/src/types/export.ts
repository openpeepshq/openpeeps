import { z } from 'zod';
import { publicAccountSchema, publicProfileSchema } from './api';

/** Data a user can download as their account export. */
export const accountExportSchema = z.object({
  account: publicAccountSchema,
  profiles: publicProfileSchema.array(),
});

export type AccountExport = z.infer<typeof accountExportSchema>;
