import type { i18n as I18nInstance } from 'i18next';

const NETWORK_ERROR_MESSAGES = new Set([
  'Failed to fetch',
  'Load failed',
  'Network request failed',
  'Network error',
  'Request timed out',
  'The Internet connection appears to be offline.',
  'NetworkError when attempting to fetch resource.',
  'ERR_NETWORK',
]);

const statusCopy = (status: number, i18n: I18nInstance): string | null => {
  const t = i18n.t;
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
  return null;
};

/**
 * Maps a thrown API error to user-facing copy:
 * a known i18n key wins (most specific), then the HTTP status, then the raw
 * message. Accepts the plain wire error objects thrown by the `openpeepsApi`
 * mutation helpers (`{ status, message, key? }`), `Error` instances, and bare
 * message strings.
 */
export const apiErrorMessage = (
  err: unknown,
  i18n: I18nInstance,
  fallback?: string,
): string => {
  const t = i18n.t;
  const fallbackCopy =
    fallback ?? t('common.errors.error', { defaultValue: 'Error' });

  const candidate =
    typeof err === 'string'
      ? err
      : ((err as { errorKey?: unknown })?.errorKey ??
        (err as { key?: unknown })?.key ??
        (err as { error?: { key?: unknown; message?: unknown } })?.error?.key ??
        (err as { error?: { message?: unknown } })?.error?.message ??
        (err as { message?: unknown })?.message);

  const candidateString = typeof candidate === 'string' ? candidate.trim() : '';

  if (candidateString && i18n.exists(candidateString)) {
    return t(candidateString);
  }

  const status = (err as { status?: unknown })?.status;
  if (typeof status === 'number') {
    const copy = statusCopy(status, i18n);
    if (copy) return copy;
  }

  if (candidateString && NETWORK_ERROR_MESSAGES.has(candidateString)) {
    return t('common.errors.networkError', {
      defaultValue: 'Network error. Please check your connection.',
    });
  }

  if (candidateString) {
    return candidateString;
  }

  return fallbackCopy;
};
