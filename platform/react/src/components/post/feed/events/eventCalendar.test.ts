import { describe, expect, it } from 'vitest';
import type { PublicPost } from '@openpeepshq/common/types';
import {
  agendaCoversRange,
  eventDayKeys,
  monthCells,
  shouldFetchMoreAgenda,
} from './eventCalendar';

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

  it('uses the calendar dates stored on an all-day event', () => {
    expect(
      eventDayKeys(
        eventPost('2026-09-23T00:00:00.000Z', '2026-09-25T00:00:00.000Z', true),
      ),
    ).toEqual(['2026-09-23', '2026-09-24', '2026-09-25']);
  });
});

describe('agenda paging', () => {
  const septemberStart = new Date(2026, 8, 1);
  const septemberEnd = new Date(2026, 8, 30, 23, 59, 59, 999);

  it('keeps paging upcoming events until one starts after the month', () => {
    expect(
      agendaCoversRange(
        [new Date(2026, 8, 2).toISOString()],
        septemberStart,
        septemberEnd,
        'forward',
      ),
    ).toBe(false);
    expect(
      agendaCoversRange(
        [new Date(2026, 9, 1).toISOString()],
        septemberStart,
        septemberEnd,
        'forward',
      ),
    ).toBe(true);
  });

  it('keeps paging past events until one starts before the month', () => {
    expect(
      agendaCoversRange(
        [new Date(2026, 8, 20).toISOString()],
        septemberStart,
        septemberEnd,
        'backward',
      ),
    ).toBe(false);
    expect(
      agendaCoversRange(
        [new Date(2026, 7, 31).toISOString()],
        septemberStart,
        septemberEnd,
        'backward',
      ),
    ).toBe(true);
  });

  it('loads every current-events page and stops past events once the month is covered', () => {
    expect(
      shouldFetchMoreAgenda({
        window: 'current',
        starts: [],
        rangeStart: septemberStart,
        rangeEnd: septemberEnd,
        hasNextPage: true,
        pagesLoaded: 1,
      }),
    ).toBe(true);
    expect(
      shouldFetchMoreAgenda({
        window: 'past',
        starts: [new Date(2026, 7, 31).toISOString()],
        rangeStart: septemberStart,
        rangeEnd: septemberEnd,
        hasNextPage: true,
        pagesLoaded: 1,
      }),
    ).toBe(false);
    expect(
      shouldFetchMoreAgenda({
        window: 'upcoming',
        starts: [],
        rangeStart: septemberStart,
        rangeEnd: septemberEnd,
        hasNextPage: false,
        pagesLoaded: 1,
      }),
    ).toBe(false);
  });
});
