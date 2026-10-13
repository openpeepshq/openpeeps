import { z } from 'zod';

export const storedMediaStatusSchema = z.enum([
  'referenced',
  'pending',
  'due',
  'unseen',
]);

export type StoredMediaStatus = z.infer<typeof storedMediaStatusSchema>;

export const storedMediaFileSchema = z.object({
  storageId: z.string(),
  size: z.number(),
  modifiedAt: z.string(),
  status: storedMediaStatusSchema,
  unreferencedSince: z.string().nullable(),
  deletesAt: z.string().nullable(),
  url: z.string(),
});

export type StoredMediaFile = z.infer<typeof storedMediaFileSchema>;

export const storedMediaListSchema = z.object({
  files: z.array(storedMediaFileSchema),
  graceMs: z.number(),
});

export type StoredMediaList = z.infer<typeof storedMediaListSchema>;
