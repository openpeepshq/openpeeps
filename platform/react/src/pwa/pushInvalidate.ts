import type { NotificationStats } from '@openpeepshq/common/types';

export type PushInvalidateMessage = {
  keys: readonly (readonly string[])[];
  notificationStats?: NotificationStats;
};

const isQueryKey = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((part) => typeof part === 'string');

export const normalizePushInvalidateMessage = (
  message: unknown,
): PushInvalidateMessage => {
  if (Array.isArray(message)) {
    return {
      keys: message.filter(isQueryKey),
    };
  }

  if (message && typeof message === 'object') {
    const record = message as {
      keys?: unknown;
      notificationStats?: NotificationStats;
    };
    const keys = Array.isArray(record.keys)
      ? record.keys.filter(isQueryKey)
      : [];
    return {
      keys,
      notificationStats: record.notificationStats,
    };
  }

  return { keys: [] };
};

export const dedupeQueryKeys = (
  keys: readonly (readonly string[])[],
): (readonly string[])[] => {
  const seen = new Set<string>();
  return keys.filter((key) => {
    const serialized = JSON.stringify(key);
    if (seen.has(serialized)) return false;
    seen.add(serialized);
    return true;
  });
};
