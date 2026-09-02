import { describe, expect, it } from 'vitest';
import {
  formatEventWhen,
  reinterpretIsoInTimeZone,
  utcIsoToZonedDateTime,
  zonedDateTimeToUtcIso,
} from '../eventTime';

describe('zonedDateTimeToUtcIso', () => {
  it('uses the selected timezone, not the runtime timezone', () => {
    // 18:00 EDT (UTC-4) → 22:00 UTC
    expect(zonedDateTimeToUtcIso('2026-08-31T18:00', 'America/New_York')).toBe(
      '2026-08-31T22:00:00.000Z',
    );
    // 18:00 CEST (UTC+2) → 16:00 UTC
    expect(zonedDateTimeToUtcIso('2026-08-31T18:00', 'Europe/Berlin')).toBe(
      '2026-08-31T16:00:00.000Z',
    );
  });

  it('applies the winter offset', () => {
    // 18:00 EST (UTC-5) → 23:00 UTC
    expect(zonedDateTimeToUtcIso('2026-01-15T18:00', 'America/New_York')).toBe(
      '2026-01-15T23:00:00.000Z',
    );
  });

  it('returns undefined for an empty value', () => {
    expect(zonedDateTimeToUtcIso('', 'UTC')).toBeUndefined();
  });
});

describe('utcIsoToZonedDateTime', () => {
  it('round-trips a wall clock in the event timezone', () => {
    const iso = zonedDateTimeToUtcIso('2026-08-31T18:00', 'America/New_York');
    expect(utcIsoToZonedDateTime(iso!, 'America/New_York')).toBe(
      '2026-08-31T18:00',
    );
  });
});

describe('reinterpretIsoInTimeZone', () => {
  it('keeps the wall clock when the timezone changes', () => {
    const ny = zonedDateTimeToUtcIso('2026-08-31T18:00', 'America/New_York');
    const berlin = reinterpretIsoInTimeZone(
      ny,
      'America/New_York',
      'Europe/Berlin',
    );
    expect(utcIsoToZonedDateTime(berlin!, 'Europe/Berlin')).toBe(
      '2026-08-31T18:00',
    );
    expect(berlin).toBe('2026-08-31T16:00:00.000Z');
  });
});

describe('formatEventWhen', () => {
  it('formats in the event timezone, not the runtime timezone', () => {
    const start = '2026-07-07T21:00:00.000Z';
    const inNewYork = formatEventWhen(start, {
      timeZone: 'America/New_York',
      locale: 'en-US',
    });
    const inBerlin = formatEventWhen(start, {
      timeZone: 'Europe/Berlin',
      locale: 'en-US',
    });

    expect(inNewYork).toMatch(/5:00\sPM/);
    expect(inNewYork).toMatch(/EDT/);
    expect(inBerlin).toMatch(/11:00\sPM/);
    expect(inNewYork).not.toBe(inBerlin);
  });

  it('includes the end time when provided', () => {
    const label = formatEventWhen('2026-07-07T21:00:00.000Z', {
      end: '2026-07-07T22:00:00.000Z',
      timeZone: 'America/New_York',
      locale: 'en-US',
    });
    expect(label).toMatch(/5:00\sPM/);
    expect(label).toMatch(/6:00\sPM/);
  });
});
