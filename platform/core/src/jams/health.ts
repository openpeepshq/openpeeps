import { createCache } from 'cache-manager';
import {
  livekitDiagnosisSchema,
  type LivekitDiagnosis,
} from '@openpeepshq/common/types';
import { config } from '../config';
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

const errorMessage = (e: unknown) =>
  e instanceof Error && e.message ? e.message : 'LiveKit health check failed';

/** Drop credential material if a client library echoes it in an error. */
export const redactSecrets = (
  message: string,
  secrets: Array<string | undefined>,
) =>
  secrets.reduce<string>((text, secret) => {
    if (!secret || secret.length < 8) return text;
    return text.split(secret).join('[redacted]');
  }, message);

export type LivekitProbeResult = {
  ok: boolean;
  error?: string;
};

/**
 * True when a LiveKit RoomService call succeeds within maxAttempts. Retries so a
 * single transient failure does not disable jams for a full /server/info bucket.
 * Credentials in config are not enough — invalid keys fail on first RPC.
 */
export const probeLivekitConnectionResult = async (
  listRooms: () => Promise<unknown>,
  timeoutMs = LIVEKIT_HEALTH_TIMEOUT_MS,
  maxAttempts = LIVEKIT_HEALTH_MAX_ATTEMPTS,
): Promise<LivekitProbeResult> => {
  let lastError = 'LiveKit health check failed';
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await withTimeout(listRooms(), timeoutMs);
      return { ok: true };
    } catch (e) {
      lastError = errorMessage(e);
      log.warn(
        `LiveKit health check failed (attempt ${attempt}/${maxAttempts}): ${lastError}`,
      );
    }
  }
  return { ok: false, error: lastError };
};

export const probeLivekitConnection = async (
  listRooms: () => Promise<unknown>,
  timeoutMs = LIVEKIT_HEALTH_TIMEOUT_MS,
  maxAttempts = LIVEKIT_HEALTH_MAX_ATTEMPTS,
): Promise<boolean> =>
  (await probeLivekitConnectionResult(listRooms, timeoutMs, maxAttempts)).ok;

/** Cached LiveKit reachability. False when unset, unauthorized, or unreachable. */
export const isLivekitConnected = () =>
  livekitHealthCache.wrap(LIVEKIT_HEALTH_CACHE_KEY, async () => {
    try {
      const rs = await roomService();
      if (rs === undefined) {
        return false;
      }
      return probeLivekitConnection(() => rs.listRooms([LIVEKIT_HEALTH_ROOM]));
    } catch (e) {
      log.warn(`LiveKit health check failed: ${errorMessage(e)}`);
      return false;
    }
  });

export type LivekitDiagnosisInput = {
  url?: string;
  hasApiKey: boolean;
  hasApiSecret: boolean;
  recordingEnabled: boolean;
  reachable: boolean;
  error?: string;
};

/** Checklist the admin diagnosis page renders. Secrets never leave this shape. */
export const buildLivekitDiagnosis = (
  input: LivekitDiagnosisInput,
): LivekitDiagnosis => {
  const configured =
    Boolean(input.url) && input.hasApiKey && input.hasApiSecret;
  return {
    connected: configured && input.reachable,
    recordingEnabled: input.recordingEnabled,
    ...(input.url ? { url: input.url } : {}),
    ...(configured && !input.reachable && input.error
      ? { error: input.error }
      : {}),
    checks: [
      { id: 'url', ok: Boolean(input.url) },
      { id: 'apiKey', ok: input.hasApiKey },
      { id: 'apiSecret', ok: input.hasApiSecret },
      { id: 'reachable', ok: configured && input.reachable },
    ],
  };
};

/**
 * Fresh LiveKit check for admins. Bypasses the short health cache so Refresh
 * reports the current credentials and the last probe error.
 */
export const diagnoseLivekit = async (): Promise<LivekitDiagnosis> => {
  const { url, apiKey, apiSecret, recordingEnabled } = (await config()).jams
    .livekit;
  const base = {
    url,
    hasApiKey: Boolean(apiKey),
    hasApiSecret: Boolean(apiSecret),
    recordingEnabled: !!recordingEnabled,
  };

  // Only probe when all credentials are present: a partial config can't tell
  // "missing secret" apart from "auth rejected" and would surface errors that
  // don't reflect the real problem.
  let reachable = false;
  let error: string | undefined;
  if (url && apiKey && apiSecret) {
    try {
      const rs = await roomService();
      if (rs) {
        const probe = await probeLivekitConnectionResult(() =>
          rs.listRooms([LIVEKIT_HEALTH_ROOM]),
        );
        reachable = probe.ok;
        error = probe.error
          ? redactSecrets(probe.error, [apiKey, apiSecret])
          : undefined;
      }
    } catch (e) {
      error = redactSecrets(errorMessage(e), [apiKey, apiSecret]);
      log.warn(`LiveKit diagnosis failed: ${error}`);
    }
  }

  return livekitDiagnosisSchema.parse(
    buildLivekitDiagnosis({ ...base, reachable, error }),
  );
};
