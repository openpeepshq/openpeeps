export const apiErrorMessage = (
  err: unknown,
  t: (key: string, options?: { defaultValue?: string }) => string,
  fallback = t('common.errors.error', { defaultValue: 'Error' }),
): string => {
  const candidate =
    (err as { errorKey?: string })?.errorKey ??
    (err as { key?: string })?.key ??
    (err as { error?: { key?: string; message?: string } })?.error?.key ??
    (err as { error?: { message?: string } })?.error?.message ??
    (err as Error)?.message;

  if (typeof candidate === 'string' && candidate.length > 0) {
    if (candidate.startsWith('error.')) {
      return t(candidate, { defaultValue: candidate });
    }
    return candidate;
  }

  return fallback;
};
