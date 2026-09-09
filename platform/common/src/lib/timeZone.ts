export const FALLBACK_TIME_ZONE = 'UTC';

export const isIanaTimeZone = (
  value: string | null | undefined,
): value is string => {
  if (!value) return false;
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value }).format();
    return true;
  } catch {
    return false;
  }
};

export const browserTimeZone = (): string => {
  try {
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return isIanaTimeZone(timeZone) ? timeZone : FALLBACK_TIME_ZONE;
  } catch {
    return FALLBACK_TIME_ZONE;
  }
};

export const ianaTimeZones = (): string[] => {
  const supportedValuesOf = (
    Intl as typeof Intl & {
      supportedValuesOf?: (key: 'timeZone') => string[];
    }
  ).supportedValuesOf;
  if (typeof supportedValuesOf === 'function') {
    return supportedValuesOf('timeZone');
  }
  const timeZone = browserTimeZone();
  return timeZone === FALLBACK_TIME_ZONE
    ? [FALLBACK_TIME_ZONE]
    : [timeZone, FALLBACK_TIME_ZONE];
};

/**
 * Profile timezone, then community timezone, then `fallback` (browser TZ
 * when omitted; emails pass UTC so the worker host TZ is never used).
 */
export const resolveTimeZone = (
  profileTimeZone?: string | null,
  communityDefault?: string | null,
  fallback?: string | null,
): string => {
  if (isIanaTimeZone(profileTimeZone)) return profileTimeZone;
  if (isIanaTimeZone(communityDefault)) return communityDefault;
  if (isIanaTimeZone(fallback)) return fallback;
  return browserTimeZone();
};
