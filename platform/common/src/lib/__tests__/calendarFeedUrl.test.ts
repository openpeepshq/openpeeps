import { describe, expect, it } from 'vitest';
import { CALENDAR_FEED_PATH, buildCalendarFeedUrl } from '../calendarFeedUrl';

describe('buildCalendarFeedUrl', () => {
  it('places the token as the last (and only) query component of the URL', () => {
    expect(buildCalendarFeedUrl('https://example.org', 'abc123')).toBe(
      `https://example.org${CALENDAR_FEED_PATH}?token=abc123`,
    );
  });

  it('strips trailing slashes from the origin (including multiple)', () => {
    expect(buildCalendarFeedUrl('https://example.org/', 'abc123')).toBe(
      `https://example.org${CALENDAR_FEED_PATH}?token=abc123`,
    );
    expect(buildCalendarFeedUrl('https://example.org///', 'abc123')).toBe(
      `https://example.org${CALENDAR_FEED_PATH}?token=abc123`,
    );
  });

  it('preserves scheme and port of the origin as-is', () => {
    expect(buildCalendarFeedUrl('https://ap.social:8443', 'abc123')).toBe(
      `https://ap.social:8443${CALENDAR_FEED_PATH}?token=abc123`,
    );
    expect(buildCalendarFeedUrl('http://localhost:5173', 'abc123')).toBe(
      `http://localhost:5173${CALENDAR_FEED_PATH}?token=abc123`,
    );
  });

  it('percent-encodes the token so any token shape stays a valid query value', () => {
    expect(buildCalendarFeedUrl('https://example.org', 'a b&c=d')).toBe(
      `https://example.org${CALENDAR_FEED_PATH}?token=a%20b%26c%3Dd`,
    );
    // The current hex token shape passes through unchanged.
    expect(buildCalendarFeedUrl('https://example.org', 'deadbeef')).toBe(
      `https://example.org${CALENDAR_FEED_PATH}?token=deadbeef`,
    );
  });
});
