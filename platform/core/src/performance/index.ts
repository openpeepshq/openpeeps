import * as Sentry from '@sentry/node';
import { logger } from '../log';

const log = logger('openpeeps:performance');

const envInt = (name: string, fallback: number): number => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
};

export const slowRequestMs = (): number => envInt('PERF_SLOW_REQUEST_MS', 1000);

export const slowQueryMs = (): number => envInt('PERF_SLOW_QUERY_MS', 200);

export const slowSpanMs = (): number => envInt('PERF_SLOW_SPAN_MS', 250);

export const dbTimingEnabled = (): boolean =>
  process.env.PERF_DB_TIMING === '1' || process.env.PERF_DB_TIMING === 'true';

export type SlowRequestRecord = {
  method: string;
  path: string;
  status: number;
  durationMs: number;
  at: string;
  hostname?: string;
};

const SLOW_REQUEST_BUFFER_SIZE = 100;
const slowRequests: SlowRequestRecord[] = [];

export const recordSlowRequest = (record: Omit<SlowRequestRecord, 'at'>) => {
  slowRequests.unshift({ ...record, at: new Date().toISOString() });
  if (slowRequests.length > SLOW_REQUEST_BUFFER_SIZE) {
    slowRequests.length = SLOW_REQUEST_BUFFER_SIZE;
  }
};

export const getSlowRequests = (): SlowRequestRecord[] => [...slowRequests];

export const clearSlowRequests = () => {
  slowRequests.length = 0;
};

/**
 * Time an async operation. Logs when over PERF_SLOW_SPAN_MS and creates a
 * Sentry child span when the SDK is initialized (no-ops otherwise).
 */
export const withSpan = async <T>(
  name: string,
  fn: () => Promise<T>,
  attributes?: Record<string, string | number | boolean>,
): Promise<T> =>
  Sentry.startSpan({ name, op: 'openpeeps', attributes }, async () => {
    const start = performance.now();
    try {
      return await fn();
    } finally {
      const durationMs = performance.now() - start;
      if (durationMs >= slowSpanMs()) {
        log.warn({ name, durationMs, ...attributes }, 'slow span');
      }
    }
  });

/** Legacy wrapper — prefer {@link withSpan} for named spans. */
export const logTime = <T extends (...args: never[]) => Promise<unknown>>(
  fn: T,
  category: string,
): T =>
  (async (...args: Parameters<T>) =>
    withSpan(category, () => fn(...args))) as T;

export const truncateSql = (sqlText: unknown, max = 240): string => {
  if (typeof sqlText !== 'string') {
    if (sqlText && typeof sqlText === 'object' && 'text' in sqlText) {
      return truncateSql((sqlText as { text: unknown }).text, max);
    }
    return String(sqlText ?? '');
  }
  const compact = sqlText.replace(/\s+/g, ' ').trim();
  return compact.length > max ? `${compact.slice(0, max)}…` : compact;
};

export const maybeLogSlowQuery = (sqlText: unknown, durationMs: number) => {
  if (!dbTimingEnabled()) return;
  if (durationMs < slowQueryMs()) return;
  log.warn({ durationMs, sql: truncateSql(sqlText) }, 'slow postgres query');
};
