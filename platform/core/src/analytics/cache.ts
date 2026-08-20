import { getSharedConnection } from '../redis';

const KEY_PREFIX = 'analytics:v4:';
const OPEN_DAY_TTL_SEC = 60 * 60;
const CLOSED_RANGE_TTL_SEC = 60 * 60 * 6;

export const analyticsCacheKey = (
  section: string,
  from: string,
  to: string,
) => `${KEY_PREFIX}${section}:${from}:${to}`;

export const getAnalyticsCache = async <T>(
  key: string,
): Promise<T | undefined> => {
  try {
    const redis = await getSharedConnection();
    const raw = await redis.get(key);
    if (!raw) return undefined;
    return JSON.parse(raw) as T;
  } catch {
    return undefined;
  }
};

export const setAnalyticsCache = async (
  key: string,
  value: unknown,
  opts?: { includesToday?: boolean },
): Promise<void> => {
  try {
    const redis = await getSharedConnection();
    const ttl = opts?.includesToday ? OPEN_DAY_TTL_SEC : CLOSED_RANGE_TTL_SEC;
    await redis.set(key, JSON.stringify(value), { EX: ttl });
  } catch {
    // Overview still returns; Redis must not 500 the request.
  }
};

export const invalidateAnalyticsCache = async (): Promise<void> => {
  const redis = await getSharedConnection();
  const keys = await redis.keys(`${KEY_PREFIX}*`);
  if (keys.length === 0) return;
  await redis.del(keys);
};
