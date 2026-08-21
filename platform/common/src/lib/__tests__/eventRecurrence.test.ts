import { describe, expect, it } from 'vitest';
import type { Event } from '../../types';
import {
  expandEventOccurrences,
  occurrencesForIndex,
  previewUpcomingOccurrences,
  sameRecurrenceId,
  upsertEventException,
} from '../eventRecurrence';

const baseEvent = (overrides: Partial<Event> = {}): Event =>
  ({
    type: 'event',
    name: 'Weekly standup',
    start: '2026-09-08T16:00:00.000Z',
    end: '2026-09-08T17:00:00.000Z',
    wholeDay: false,
    ...overrides,
  }) as Event;

describe('expandEventOccurrences', () => {
  it('returns the single instance for a one-off event', () => {
    const occurrences = expandEventOccurrences(baseEvent(), {
      from: new Date('2026-01-01T00:00:00.000Z'),
      to: new Date('2026-12-31T00:00:00.000Z'),
    });
    expect(occurrences).toEqual([
      {
        recurrenceId: '2026-09-08T16:00:00.000Z',
        start: '2026-09-08T16:00:00.000Z',
        end: '2026-09-08T17:00:00.000Z',
        cancelled: false,
      },
    ]);
  });

  it('expands a weekly series until COUNT', () => {
    const occurrences = expandEventOccurrences(
      baseEvent({
        recurrence: { freq: 'WEEKLY', count: 3 },
      }),
      {
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-12-01T00:00:00.000Z'),
      },
    );
    expect(occurrences.map((o) => o.recurrenceId)).toEqual([
      '2026-09-08T16:00:00.000Z',
      '2026-09-15T16:00:00.000Z',
      '2026-09-22T16:00:00.000Z',
    ]);
    expect(occurrences[1].end).toBe('2026-09-15T17:00:00.000Z');
  });

  it('stops at UNTIL', () => {
    const occurrences = expandEventOccurrences(
      baseEvent({
        recurrence: {
          freq: 'WEEKLY',
          until: '2026-09-20T00:00:00.000Z',
        },
      }),
      {
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-12-01T00:00:00.000Z'),
      },
    );
    expect(occurrences.map((o) => o.recurrenceId)).toEqual([
      '2026-09-08T16:00:00.000Z',
      '2026-09-15T16:00:00.000Z',
    ]);
  });

  it('omits EXDATE cancellations from active results but marks them cancelled', () => {
    const occurrences = expandEventOccurrences(
      baseEvent({
        recurrence: { freq: 'WEEKLY', count: 3 },
        exceptions: [
          { recurrenceId: '2026-09-15T16:00:00.000Z', cancelled: true },
        ],
      }),
      {
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-12-01T00:00:00.000Z'),
      },
    );
    expect(
      occurrences.find((o) => o.recurrenceId === '2026-09-15T16:00:00.000Z')
        ?.cancelled,
    ).toBe(true);
  });

  it('applies a this-event start override', () => {
    const occurrences = expandEventOccurrences(
      baseEvent({
        recurrence: { freq: 'WEEKLY', count: 2 },
        exceptions: [
          {
            recurrenceId: '2026-09-15T16:00:00.000Z',
            start: '2026-09-15T18:00:00.000Z',
            end: '2026-09-15T19:00:00.000Z',
          },
        ],
      }),
      {
        from: new Date('2026-09-01T00:00:00.000Z'),
        to: new Date('2026-12-01T00:00:00.000Z'),
      },
    );
    expect(occurrences[1]).toMatchObject({
      recurrenceId: '2026-09-15T16:00:00.000Z',
      start: '2026-09-15T18:00:00.000Z',
      end: '2026-09-15T19:00:00.000Z',
      cancelled: false,
    });
  });
});

describe('occurrencesForIndex', () => {
  it('includes a series whose first start is in the past', () => {
    const now = new Date('2026-10-01T00:00:00.000Z');
    const rows = occurrencesForIndex(
      baseEvent({
        start: '2026-01-06T16:00:00.000Z',
        end: '2026-01-06T17:00:00.000Z',
        recurrence: { freq: 'WEEKLY' },
      }),
      now,
    ).filter((row) => !row.cancelled && new Date(row.start) > now);
    expect(rows.length).toBeGreaterThan(0);
    expect(new Date(rows[0].start).getTime()).toBeGreaterThan(now.getTime());
  });
});

describe('previewUpcomingOccurrences', () => {
  it('returns the next three dates', () => {
    const preview = previewUpcomingOccurrences(
      baseEvent({ recurrence: { freq: 'WEEKLY' } }),
      3,
      new Date('2026-09-08T16:00:00.000Z'),
    );
    expect(preview).toHaveLength(3);
  });
});

describe('upsertEventException', () => {
  it('replaces an exception with the same recurrence id', () => {
    const event = upsertEventException(
      upsertEventException(baseEvent(), {
        recurrenceId: '2026-09-15T16:00:00.000Z',
        cancelled: true,
      }),
      {
        recurrenceId: '2026-09-15T16:00:00.000Z',
        start: '2026-09-15T18:00:00.000Z',
      },
    );
    expect(event.exceptions).toHaveLength(1);
    expect(event.exceptions?.[0].cancelled).toBeUndefined();
    expect(
      sameRecurrenceId(
        event.exceptions?.[0].recurrenceId,
        '2026-09-15T16:00:00.000Z',
      ),
    ).toBe(true);
  });
});
