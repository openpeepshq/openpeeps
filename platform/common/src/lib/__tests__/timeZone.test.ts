import { describe, expect, it } from 'vitest';
import {
  browserTimeZone,
  FALLBACK_TIME_ZONE,
  isIanaTimeZone,
  resolveTimeZone,
} from '../timeZone';

describe('isIanaTimeZone', () => {
  it('accepts a valid IANA zone', () => {
    expect(isIanaTimeZone('America/New_York')).toBe(true);
    expect(isIanaTimeZone('UTC')).toBe(true);
  });

  it('rejects missing or invalid values', () => {
    expect(isIanaTimeZone(undefined)).toBe(false);
    expect(isIanaTimeZone('')).toBe(false);
    expect(isIanaTimeZone('Not/A_Zone')).toBe(false);
  });
});

describe('resolveTimeZone', () => {
  it('prefers the profile setting', () => {
    expect(resolveTimeZone('Europe/Berlin', 'America/New_York')).toBe(
      'Europe/Berlin',
    );
  });

  it('falls back to the community default', () => {
    expect(resolveTimeZone(undefined, 'America/New_York')).toBe(
      'America/New_York',
    );
  });

  it('falls back to the browser timezone', () => {
    expect(resolveTimeZone(undefined, undefined)).toBe(browserTimeZone());
  });

  it('uses an explicit fallback before the browser timezone', () => {
    expect(resolveTimeZone(undefined, undefined, 'UTC')).toBe('UTC');
    expect(resolveTimeZone('Nope', undefined, 'Europe/Vienna')).toBe(
      'Europe/Vienna',
    );
  });

  it('ignores invalid values and continues the chain', () => {
    expect(resolveTimeZone('Nope', 'Europe/Vienna')).toBe('Europe/Vienna');
    expect(resolveTimeZone('Nope', 'Also/Nope')).toBe(browserTimeZone());
  });

  it('never returns an empty string', () => {
    expect(resolveTimeZone('', '')).toBe(browserTimeZone());
    expect(browserTimeZone()).toBeTruthy();
    expect(FALLBACK_TIME_ZONE).toBe('UTC');
  });
});
