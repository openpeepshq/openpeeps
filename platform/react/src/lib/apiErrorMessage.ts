import type { TFunction } from 'i18next';

/** Transport-level failure messages (fetch, XMLHttpRequest, React Native). */
const NETWORK_ERROR_MESSAGES = new Set([
  'Failed to fetch',
  'Load failed',
  'Network error',
  'NetworkRequestFailed',
  'Request timed out',
]);

/**
 * Extracts the server-provided error message (or i18n key) from the shapes
 * the client can receive: thrown JSON error objects, nested `{ error }`
 * envelopes, `Error` instances, or a raw string.
 */
export const apiErrorCandidate = (err: unknown): string => {
  if (typeof err === 'string') return err;
  if (typeof err !== 'object' || err === null) return '';
  const record = err as {
    errorKey?: unknown;
    key?: unknown;
    message?: unknown;
    error?: { key?: unknown; message?: unknown } | null;
  };
  const candidate =
    record.errorKey ??
    record.key ??
    record.error?.key ??
    record.error?.message ??
    record.message;
  return typeof candidate === 'string' ? candidate : '';
};

const errorStatus = (err: unknown): number | undefined => {
  if (typeof err !== 'object' || err === null) return undefined;
  const record = err as {
    status?: unknown;
    error?: { status?: unknown } | null;
  };
  const status = record.status ?? record.error?.status;
  return typeof status === 'number' ? status : undefined;
};

const statusMessage = (status: number, t: TFunction): string | undefined => {
  if (status === 401) {
    return t('common.errors.unauthorized', {
      defaultValue: 'Please log in to continue',
    });
  }
  if (status === 403) {
    return t('common.errors.forbidden', {
      defaultValue: "You don't have permission to perform this action",
    });
  }
  if (status === 404) {
    return t('common.errors.notFound', { defaultValue: 'Not found' });
  }
  if (status >= 500) {
    return t('common.errors.serverError', {
      defaultValue: 'Server error. Please try again later.',
    });
  }
  return undefined;
};

/**
 * Maps a thrown API error to user-facing copy.
 *
 * Resolution order:
 * 1. Network/transport failure → `common.errors.networkError`.
 * 2. Candidate that exists as an i18n key → its translation (the server
 *    sends keys for the errors it localizes).
 * 3. Any other candidate with a status → localized copy by status, e.g.
 *    401 → `common.errors.unauthorized`.
 * 4. The candidate as-is.
 * 5. No message → localized copy by status, else `fallback`.
 */
export const apiErrorMessage = (
  err: unknown,
  t: TFunction,
  fallback?: string,
): string => {
  const candidate = apiErrorCandidate(err);
  const status = errorStatus(err);

  if (candidate.length > 0) {
    if (NETWORK_ERROR_MESSAGES.has(candidate)) {
      return t('common.errors.networkError', {
        defaultValue: 'Network error. Please check your connection.',
      });
    }
    // A non-empty translation means the candidate is an i18n key.
    const translated = t(candidate, { defaultValue: '' });
    if (typeof translated === 'string' && translated.length > 0) {
      return translated;
    }
    if (status !== undefined) {
      const statusCopy = statusMessage(status, t);
      if (statusCopy) return statusCopy;
    }
    return candidate;
  }

  return (
    (status !== undefined ? statusMessage(status, t) : undefined) ??
    fallback ??
    t('common.errors.error', { defaultValue: 'Error' })
  );
};
