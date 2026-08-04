import { Base64 } from 'js-base64';

/** Normalize VAPID public keys for comparison (url-safe, no padding). */
export const normalizeVapidKey = (key: string): string =>
  key.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');

export const vapidKeyFromBuffer = (key: BufferSource): string =>
  normalizeVapidKey(
    Base64.fromUint8Array(new Uint8Array(key as ArrayBuffer), true),
  );

/** Copy into a tight buffer — some browsers reject views into larger ArrayBuffers. */
export const vapidKeyBytes = (applicationServerKey: string): Uint8Array =>
  new Uint8Array(Base64.toUint8Array(applicationServerKey));

export const subscriptionKeyMatches = (
  subscriptionKey: BufferSource | null | undefined,
  applicationServerKey: string,
): boolean => {
  if (!subscriptionKey) return false;
  return (
    vapidKeyFromBuffer(subscriptionKey) ===
    normalizeVapidKey(applicationServerKey)
  );
};
