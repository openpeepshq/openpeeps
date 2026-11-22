import { z } from 'zod';

/**
 * Full personal data export (GDPR-style). Requested via `POST`, assembled
 * asynchronously by a worker job, downloaded via a short-lived token.
 */

export const accountExportJobSchema = z.object({
  jobId: z.uuid(),
});
export type AccountExportJob = z.infer<typeof accountExportJobSchema>;

/**
 * Lifecycle states of an account export, as reported by the status endpoint:
 * - `building` — the worker has not (yet) written a record, or is assembling
 *   the archive; the client keeps polling.
 * - `ready` — the archive exists; the response carries the single-use
 *   `downloadToken` and its `expiresAt`. The client stops polling and offers
 *   the download.
 * - `error` — assembly failed; the response carries `error`. Stop polling.
 * - `expired` — the record's token lapsed or the archive was cleaned up; the
 *   client stops polling and asks the user to start a new export.
 * - `not-found` — no record for the given `jobId` (unknown to this account).
 */
export const accountExportStateSchema = z.enum([
  'building',
  'ready',
  'error',
  'expired',
  'not-found',
]);
export type AccountExportState = z.infer<typeof accountExportStateSchema>;

/** `GET /accounts/current/export/status?jobId=…` */
export const accountExportStatusSchema = z.object({
  jobId: z.uuid(),
  state: accountExportStateSchema,
  /** Present once `state === 'ready'`. Pass to the download endpoint. */
  downloadToken: z.string().optional(),
  /** When `state === 'ready'`, the download token stops working after this. */
  expiresAt: z.string().datetime().optional(),
  error: z.string().optional(),
});
export type AccountExportStatus = z.infer<typeof accountExportStatusSchema>;

/**
 * The "ready" payload shared by every producer of a finished export — the
 * worker that assembles the archive and the status endpoint that reports it.
 * Single-sourcing the `state`/`downloadToken`/`expiresAt` triple here keeps the
 * two from drifting as the API grows (adding a field to the shape now means
 * touching one type instead of both construction sites). Type-only: it mirrors
 * `AccountExportStatus`'s ready fields, so it changes no runtime surface.
 */
export type AccountExportReady = Pick<
  AccountExportStatus,
  'downloadToken' | 'expiresAt'
> & {
  /** The ready state, as a literal — the only state that carries the fields. */
  state: 'ready';
};
