import { describe, expect, it } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import { eventDayKeys, groupPostsByDay, monthCells } from './eventCalendar';
import { monthRangeWindow } from '../../../../hooks/events/useEventsCalendar';

const eventPost = (start: string, end?: string, wholeDay = false): PublicPost =>
  ({
    id: start,
    data: { type: 'event', start, end, wholeDay, name: 'Meet' },
    occurrenceStart: start,
    occurrenceEnd: end,
  }) as PublicPost;

describe('monthCells', () => {
  it('pads September 2026 from the previous Sunday and drops the extra week', () => {
    const cells = monthCells(2026, 8);
    expect(cells[0]?.key).toBe('2026-08-30');
    expect(cells.find((cell) => cell.inMonth)?.key).toBe('2026-09-01');
    expect(cells.at(-1)?.key).toBe('2026-10-03');
    expect(cells).toHaveLength(35);
  });

  it('uses four weeks when the month starts on Sunday and fits exactly', () => {
    const cells = monthCells(2026, 1);
    expect(cells[0]?.key).toBe('2026-02-01');
    expect(cells.at(-1)?.key).toBe('2026-02-28');
    expect(cells.every((cell) => cell.inMonth)).toBe(true);
    expect(cells).toHaveLength(28);
  });
});

describe('eventDayKeys', () => {
  it('keeps a timed event on its local start day', () => {
    const start = new Date(2026, 8, 23, 15, 0);
    const end = new Date(2026, 8, 23, 16, 0);
    expect(
      eventDayKeys(eventPost(start.toISOString(), end.toISOString())),
    ).toEqual(['2026-09-23']);
  });

  it('spans each local day a timed event touches', () => {
    const start = new Date(2026, 8, 23, 22, 0);
    const end = new Date(2026, 8, 25, 10, 0);
    expect(
      eventDayKeys(eventPost(start.toISOString(), end.toISOString())),
    ).toEqual(['2026-09-23', '2026-09-24', '2026-09-25']);
  });

  it('does not include the next day when the event ends at midnight', () => {
    const start = new Date(2026, 8, 23, 20, 0);
    const end = new Date(2026, 8, 24, 0, 0, 0, 0);
    expect(
      eventDayKeys(eventPost(start.toISOString(), end.toISOString())),
    ).toEqual(['2026-09-23']);
  });

  it('spans each day a whole-day event touches', () => {
    expect(
      eventDayKeys(
        eventPost('2026-09-23T00:00:00Z', '2026-09-25T23:59:59Z', true),
      ),
    ).toEqual(['2026-09-23', '2026-09-24', '2026-09-25']);
  });
});

/** One row per occurrence, as the date-range feed returns them. */
describe('groupPostsByDay with occurrence rows', () => {
  it('puts a weekly series on consecutive Mondays and never on another weekday', () => {
    // Finding 1: the reported series — weekly Mondays ×3.
    const mondays = [21, 28, 35].map((day) => new Date(2026, 8, day, 18, 0));
    const posts = mondays.map((start) =>
      eventPost(
        start.toISOString(),
        new Date(start.getTime() + 60 * 60 * 1000).toISOString(),
      ),
    );
    const byDay = groupPostsByDay(posts);
    expect(byDay.get('2026-09-21')).toHaveLength(1);
    expect(byDay.get('2026-09-28')).toHaveLength(1);
    expect(byDay.get('2026-10-05')).toHaveLength(1);
    // A Wednesday bucket must stay empty for these rows.
    expect(byDay.get('2026-09-23')).toBeUndefined();
  });
});

describe('monthRangeWindow', () => {
  it('covers the padded September 2026 grid exactly', () => {
    // The grid pads from Sun Aug 30 to Sat Oct 3 (UTC test env: offset +00:00).
    const { from, to } = monthRangeWindow(2026, 8);
    expect(from).toBe('2026-08-30T00:00:00+00:00');
    expect(to).toBe('2026-10-04T00:00:00+00:00');
  });
});
