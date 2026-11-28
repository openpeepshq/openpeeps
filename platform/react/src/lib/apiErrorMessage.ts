import type { TFunction } from 'i18next';

/**
 * Literal error-message *strings* (not HTTP statuses) that fetch / XHR /
 * React Native produce when the request never completes at the transport
 * level (offline, DNS, CORS, timeout). The set is matched against the
 * extracted candidate, so a status-bearing wire error can never be
 * misread as a network failure.
 */
const NETWORK_ERROR_MESSAGES = new Set([
  'Failed to fetch',
  'Load failed',
  'Network error',
  'NetworkRequestFailed',
  'Network request failed',
  'The Internet connection appears to be offline',
  'Request timed out',
]);

/**
 * Extracts the server-provided error message (or i18n key) from the shapes
 * the client can receive: thrown JSON error objects, nested `{ error }`
 * envelopes, `Error` instances, or a raw string.
 *
 * The first defined string position wins, in this order:
 * `errorKey` → `key` → `error.key` → `error.errorKey` → `error.message`
 * → `message`.
 */
export const apiErrorCandidate = (err: unknown): string => {
  if (typeof err === 'string') return err;
  if (typeof err !== 'object' || err === null) return '';
  const record = err as {
    errorKey?: unknown;
    key?: unknown;
    message?: unknown;
    error?: { key?: unknown; errorKey?: unknown; message?: unknown } | null;
  };
  const candidate =
    record.errorKey ??
    record.key ??
    record.error?.key ??
    record.error?.errorKey ??
    record.error?.message ??
    record.message;
  return typeof candidate === 'string' ? candidate : '';
};

/**
 * Top-level `status` wins over a nested `error.status` (`record.status ??
 * record.error?.status`); the wire body carries the authoritative code on
 * the outside, so a stale nested status never changes the fallback copy.
 */
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
 * The client keeps the wire error object (the auth helpers re-throw the
 * parsed JSON body as-is) because Riddl serializes the thrown `httpError`
 * into that body with `status` at the top level — so `status`, `message`
 * and `key` reach the mapper together in one object. The fetch client's
 * SSE stream errors reach the mapper in the same shape (`SseError`:
 * `status?` from the response code, `key?` from the body's
 * `errorKey ?? key`, `message?` from the body's `message`).
 *
 * Resolution order, non-empty candidate (see `apiErrorCandidate`):
 * 1. Network/transport failure → `common.errors.networkError`.
 * 2. Candidate that exists as an i18n key → its translation (the server
 *    sends keys for the errors it localizes).
 * 3. A sub-500 candidate with a status → localized copy by status, e.g.
 *    401 → `common.errors.unauthorized` (a translated key still wins over
 *    the status copy, so specific server keys stay specific).
 * 4. Otherwise the candidate as-is — including 5xx with a message: a
 *    message-bearing 5xx (proxy/gateway text, SSE stream failures) is
 *    already human-readable, and passing it through raw is main's
 *    pre-PR behavior, which main's waiting-room tests pin.
 *
 * Empty candidate (no message in any position — the raw candidate only
 * applies to a non-empty one; here the caller's `fallback` beats the
 * status copy):
 * 5. The caller's `fallback` (callers pass context-specific copy, e.g.
 *    the logout push-cleanup toast), else localized copy by status, else
 *    `common.errors.error`.
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
    // i18next resolves a missing key to its `defaultValue` (here `''`), so a
    // non-empty result is a reliable translate-if-exists test.
    const translated = t(candidate, { defaultValue: '' });
    if (typeof translated === 'string' && translated.length > 0) {
      return translated;
    }
    // A message-bearing 5xx passes through raw: it is already
    // human-readable (proxy/gateway text, SSE stream failures) and main's
    // waiting-room tests pin that passthrough. Only sub-500 statuses get a
    // localized copy here; a 5xx *without* a message still maps to the
    // generic server copy in the empty-candidate path below.
    if (status !== undefined && status < 500) {
      const statusCopy = statusMessage(status, t);
      if (statusCopy) return statusCopy;
    }
    return candidate;
  }

  return (
    fallback ??
    (status !== undefined ? statusMessage(status, t) : undefined) ??
    t('common.errors.error', { defaultValue: 'Error' })
  );
};
