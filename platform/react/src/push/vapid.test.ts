import { Base64 } from 'js-base64';
import { describe, expect, it } from 'vitest';
import {
  normalizeVapidKey,
  subscriptionKeyMatches,
  vapidKeyBytes,
  vapidKeyFromBuffer,
} from './vapid';

describe('vapid key helpers', () => {
  // 65-byte buffer round-trips through url-safe base64 like a VAPID public key.
  const raw = new Uint8Array(65).map((_, i) => i + 1);
  const urlSafe = Base64.fromUint8Array(raw, true);
  const withPadding = `${urlSafe}==`;
  const standard = urlSafe.replace(/-/g, '+').replace(/_/g, '/');

  it('normalizes padding and base64 alphabet', () => {
    expect(normalizeVapidKey(withPadding)).toBe(normalizeVapidKey(urlSafe));
    expect(normalizeVapidKey(standard)).toBe(normalizeVapidKey(urlSafe));
  });

  it('round-trips bytes for matching', () => {
    const bytes = vapidKeyBytes(urlSafe);
    expect(subscriptionKeyMatches(bytes, withPadding)).toBe(true);
    expect(subscriptionKeyMatches(bytes, standard)).toBe(true);
    expect(vapidKeyFromBuffer(bytes)).toBe(normalizeVapidKey(urlSafe));
  });

  it('rejects missing or different keys', () => {
    expect(subscriptionKeyMatches(null, urlSafe)).toBe(false);
    expect(subscriptionKeyMatches(raw, 'AAAA')).toBe(false);
  });
});
