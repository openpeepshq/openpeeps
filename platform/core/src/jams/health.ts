import { createCache } from 'cache-manager';
import { logger } from '../log';
import { roomService } from './livekit';

const log = logger('app:jams:livekit');

/** Sentinel room name so the probe authenticates without listing every room. */
const LIVEKIT_HEALTH_ROOM = '__openpeeps_livekit_health__';
const LIVEKIT_HEALTH_CACHE_KEY = 'livekit-health';

export const LIVEKIT_HEALTH_TIMEOUT_MS = 5000;
export const LIVEKIT_HEALTH_MAX_ATTEMPTS = 3;

const livekitHealthCache = createCache({
  ttl: 20 * 1000,
  refreshThreshold: 5 * 1000,
});

const withTimeout = <T>(promise: Promise<T>, timeoutMs: number): Promise<T> =>
  new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('LiveKit health check timed out'));
    }, timeoutMs);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err: unknown) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });

/**
 * True when a LiveKit RoomService call succeeds within maxAttempts. Retries so a
 * single transient failure does not disable jams for a full /server/info bucket.
 * Credentials in config are not enough — invalid keys fail on first RPC.
 */
export const probeLivekitConnection = async (
  listRooms: () => Promise<unknown>,
  timeoutMs = LIVEKIT_HEALTH_TIMEOUT_MS,
  maxAttempts = LIVEKIT_HEALTH_MAX_ATTEMPTS,
): Promise<boolean> => {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await withTimeout(listRooms(), timeoutMs);
      return true;
    } catch (e) {
      log.warn(
        `LiveKit health check failed (attempt ${attempt}/${maxAttempts}): ${(e as Error).message}`,
      );
    }
  }
  return false;
};

/** Cached LiveKit reachability. False when unset, unauthorized, or unreachable. */
export const isLivekitConnected = () =>
  livekitHealthCache.wrap(LIVEKIT_HEALTH_CACHE_KEY, async () => {
    const rs = await roomService();
    if (rs === undefined) {
      return false;
    }
    return probeLivekitConnection(() => rs.listRooms([LIVEKIT_HEALTH_ROOM]));
  });
