/**
 * Shipped RN clients remount auth when /server/info identity changes.
 * Round volatile clocks down to the current 10-minute wall-clock bucket
 * so successive JSON payloads stay deep-equal.
 */
export const SERVER_INFO_BUCKET_MS = 10 * 60 * 1000;

export const roundDownTo = (value: number, step: number) =>
  Math.floor(value / step) * step;

export const serverInfoBucketStart = (now = Date.now()) =>
  roundDownTo(now, SERVER_INFO_BUCKET_MS);

export const roundDownUptimeSeconds = (uptimeSeconds: number) =>
  roundDownTo(Math.max(0, uptimeSeconds), SERVER_INFO_BUCKET_MS / 1000);

type Snapshot<T> = { at: number; value: T };

export const createStableLoader = <T>(bucketMs = SERVER_INFO_BUCKET_MS) => {
  let snapshot: Snapshot<T> | null = null;
  let inflight: Promise<T> | null = null;

  const get = async (load: () => Promise<T>, now = Date.now()): Promise<T> => {
    const bucket = roundDownTo(now, bucketMs);
    if (snapshot && snapshot.at === bucket) {
      return snapshot.value;
    }
    if (inflight) {
      return inflight;
    }
    inflight = load()
      .then((value) => {
        snapshot = { at: bucket, value };
        return value;
      })
      .finally(() => {
        inflight = null;
      });
    return inflight;
  };

  const reset = () => {
    snapshot = null;
    inflight = null;
  };

  return { get, reset };
};

export const stablePublicServerInfo = createStableLoader();
