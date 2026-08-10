import type { Job } from 'bullmq';
import type { Logger } from '@openpeepshq/common/types';

// Helpers for writing structured, step-by-step progress to BOTH a BullMQ job's
// per-job log (visible in the admin diagnostics UI) and a namespace `logger`.
// Mirrors the lightweight pattern used by the email worker (`email/send.ts`).

export type JobLog = (message: string) => Promise<void>;

/** Wraps `job.log` so callers get a simple `(message) => Promise<void>`. */
export const jobLogger =
  (job: Job): JobLog =>
  (message) =>
    job.log(message).then(() => undefined);

/**
 * Best-effort, human-readable rendering of an error. Pulls the fields that the
 * push backends attach (web-push `statusCode`/`body`, APNs `reason`, FCM
 * `code`) so failed deliveries are diagnosable from the job log alone.
 */
export const formatErrorDetail = (error: unknown): string => {
  if (error instanceof Error) {
    const e = error as Error & {
      code?: string | number;
      statusCode?: number;
      reason?: string;
      body?: unknown;
    };
    const parts = [e.message];
    if (e.code != null) parts.push(`code=${e.code}`);
    if (e.statusCode != null) parts.push(`statusCode=${e.statusCode}`);
    if (e.reason) parts.push(`reason=${e.reason}`);
    if (e.body) {
      const body = typeof e.body === 'string' ? e.body : JSON.stringify(e.body);
      parts.push(`body=${body.slice(0, 300)}`);
    }
    return parts.join(' | ');
  }
  if (error && typeof error === 'object') {
    const e = error as Record<string, unknown>;
    const reason = e.reason ?? e.code ?? e.message;
    if (reason != null) return String(reason);
    try {
      return JSON.stringify(error);
    } catch {
      return String(error);
    }
  }
  return String(error);
};

/** Log a normal progress step to the job log (if present) and the logger. */
export const logStep = async (
  jobLog: JobLog | undefined,
  log: Logger,
  message: string,
): Promise<void> => {
  if (jobLog) await jobLog(message);
  log.info(message);
};

/**
 * Log a failure to the job log (if present) and the logger with `FAILED —`
 * emphasis, including the formatted error detail and stack when available.
 */
export const logFailure = async (
  jobLog: JobLog | undefined,
  log: Logger,
  message: string,
  error?: unknown,
): Promise<void> => {
  const line =
    error === undefined
      ? `FAILED — ${message}`
      : `FAILED — ${message}: ${formatErrorDetail(error)}`;
  if (jobLog) await jobLog(line);
  log.error(line);
  if (error instanceof Error && error.stack) {
    if (jobLog) await jobLog(error.stack);
    log.error(error.stack);
  }
};
