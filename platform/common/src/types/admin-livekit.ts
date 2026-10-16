import { z } from 'zod';

export const livekitDiagnosisCheckIdSchema = z.enum([
  'url',
  'apiKey',
  'apiSecret',
  'reachable',
]);

export const livekitDiagnosisSchema = z.object({
  connected: z.boolean(),
  recordingEnabled: z.boolean(),
  url: z.string().optional(),
  /** Last probe failure. Credentials are redacted before this is returned. */
  error: z.string().optional(),
  checks: z.array(
    z.object({
      id: livekitDiagnosisCheckIdSchema,
      ok: z.boolean(),
    }),
  ),
});

export type LivekitDiagnosis = z.infer<typeof livekitDiagnosisSchema>;
