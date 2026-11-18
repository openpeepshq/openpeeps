import { describe, expect, it } from 'vitest';
import type {
  EventOccurrenceException,
  PublicPost,
} from '@openpeepshq/common/types';
import {
  agendaCoversRange,
  eventDayKeys,
  expandRecurringAgendaPosts,
  applyAgendaWindowFilter,
  groupPostsByDay,
  monthCells,
  shouldFetchMoreAgenda,
  uniquePosts,
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

const weeklySeries = (exceptions?: EventOccurrenceException[]): PublicPost => {
  const start = new Date(2026, 8, 8, 16, 0, 0, 0);
  const end = new Date(2026, 8, 8, 17, 0, 0, 0);
  return {
    id: 'series',
    data: {
      type: 'event',
      name: 'test test',
      start: start.toISOString(),
      end: end.toISOString(),
      wholeDay: false,
      recurrence: { freq: 'WEEKLY', count: 3 },
      ...(exceptions ? { exceptions } : {}),
    },
    occurrenceRecurrenceId: start.toISOString(),
    occurrenceStart: start.toISOString(),
    occurrenceEnd: end.toISOString(),
  } as PublicPost;
};

const dayKeys = (posts: PublicPost[]): string[] => [
  ...groupPostsByDay(posts).keys(),
];

describe('expandRecurringAgendaPosts', () => {
  const beforeSeries = new Date(2026, 8, 1, 12, 0, 0, 0);

  it('places each weekly occurrence on its own date', () => {
    const posts = expandRecurringAgendaPosts(
      [weeklySeries()],
      'upcoming',
      beforeSeries,
    );
    expect(dayKeys(posts)).toEqual(['2026-09-08', '2026-09-15', '2026-09-22']);
    expect(posts.map((post) => post.occurrenceRecurrenceId)).toEqual(
      posts.map((post) => post.occurrenceStart),
    );
  });

  it('keeps a one-off event on the agenda row', () => {
    const start = new Date(2026, 8, 8, 16, 0, 0, 0);
    const post = eventPost(start.toISOString(), undefined);
    expect(
      expandRecurringAgendaPosts([post], 'upcoming', beforeSeries),
    ).toEqual([post]);
  });

  it('drops cancelled and out-of-window occurrences', () => {
    const second = new Date(2026, 8, 15, 16, 0, 0, 0);
    const posts = expandRecurringAgendaPosts(
      [
        weeklySeries([
          {
            recurrenceId: second.toISOString(),
            cancelled: true,
          },
        ]),
      ],
      'upcoming',
      new Date(2026, 8, 10, 12, 0, 0, 0),
    );
    expect(dayKeys(posts)).toEqual(['2026-09-22']);
  });

  it('shows only occurrences that have ended on the past calendar', () => {
    const posts = expandRecurringAgendaPosts(
      [weeklySeries()],
      'past',
      new Date(2026, 8, 16, 12, 0, 0, 0),
    );
    expect(dayKeys(posts)).toEqual(['2026-09-08', '2026-09-15']);
  });

  it('shows the occurrence in progress on the current calendar', () => {
    const posts = expandRecurringAgendaPosts(
      [weeklySeries()],
      'current',
      new Date(2026, 8, 15, 16, 30, 0, 0),
    );
    expect(dayKeys(posts)).toEqual(['2026-09-15']);
  });

  it('uses a moved occurrence date', () => {
    const second = new Date(2026, 8, 15, 16, 0, 0, 0);
    const movedStart = new Date(2026, 8, 16, 18, 0, 0, 0);
    const movedEnd = new Date(2026, 8, 16, 19, 0, 0, 0);
    const posts = expandRecurringAgendaPosts(
      [
        weeklySeries([
          {
            recurrenceId: second.toISOString(),
            start: movedStart.toISOString(),
            end: movedEnd.toISOString(),
          },
        ]),
      ],
      'upcoming',
      beforeSeries,
    );
    expect(dayKeys(posts)).toEqual(['2026-09-08', '2026-09-16', '2026-09-22']);
  });

  it('excludes a one-off past event from the upcoming calendar', () => {
    const start = new Date(2026, 7, 15, 10, 0, 0, 0);
    const end = new Date(2026, 7, 15, 11, 0, 0, 0);
    const post = eventPost(start.toISOString(), end.toISOString());
    const posts = expandRecurringAgendaPosts(
      [post],
      'upcoming',
      new Date(2026, 8, 1, 12, 0, 0, 0),
    );
    expect(posts).toEqual([]);
  });

  it('drops a recurring series whose occurrences are all past', () => {
    const posts = expandRecurringAgendaPosts(
      [weeklySeries()],
      'upcoming',
      new Date(2026, 9, 1, 12, 0, 0, 0),
    );
    expect(posts).toEqual([]);
  });

  it('keeps an event that started in the past but has not ended on upcoming', () => {
    const start = new Date(2026, 7, 1, 10, 0, 0, 0);
    const end = new Date(2026, 9, 30, 22, 0, 0, 0);
    const post = eventPost(start.toISOString(), end.toISOString());
    const posts = expandRecurringAgendaPosts(
      [post],
      'upcoming',
      new Date(2026, 8, 15, 12, 0, 0, 0),
    );
    expect(posts).toEqual([post]);
  });

  it('keeps a started event without an explicit end on upcoming until the implied hour passes', () => {
    const start = new Date(2026, 8, 15, 11, 40, 0, 0);
    const post = eventPost(start.toISOString());
    const posts = expandRecurringAgendaPosts(
      [post],
      'upcoming',
      new Date(2026, 8, 15, 12, 0, 0, 0),
    );
    expect(posts).toEqual([post]);
  });

  it('excludes a future one-off event from the past calendar', () => {
    const start = new Date(2026, 9, 10, 10, 0, 0, 0);
    const end = new Date(2026, 9, 10, 11, 0, 0, 0);
    const post = eventPost(start.toISOString(), end.toISOString());
    const posts = expandRecurringAgendaPosts(
      [post],
      'past',
      new Date(2026, 8, 1, 12, 0, 0, 0),
    );
    expect(posts).toEqual([]);
  });

  it('keeps an in-progress one-off event on the current calendar', () => {
    const start = new Date(2026, 8, 1, 11, 0, 0, 0);
    const end = new Date(2026, 8, 1, 13, 0, 0, 0);
    const post = eventPost(start.toISOString(), end.toISOString());
    const posts = expandRecurringAgendaPosts(
      [post],
      'current',
      new Date(2026, 8, 1, 12, 0, 0, 0),
    );
    expect(posts).toEqual([post]);
  });
});

describe('applyAgendaWindowFilter', () => {
  const pastOneOff = eventPost(
    new Date(2026, 7, 15, 10, 0, 0, 0).toISOString(),
    new Date(2026, 7, 15, 11, 0, 0, 0).toISOString(),
  );

  it('drops a past one-off event from the upcoming list', () => {
    expect(
      applyAgendaWindowFilter(
        [pastOneOff],
        'upcoming',
        new Date(2026, 8, 1, 12, 0),
      ),
    ).toEqual([]);
  });

  it('keeps a one-off event row intact on the upcoming list', () => {
    const future = eventPost(
      new Date(2026, 8, 20, 10, 0, 0, 0).toISOString(),
      new Date(2026, 8, 20, 11, 0, 0, 0).toISOString(),
    );
    expect(
      applyAgendaWindowFilter(
        [future],
        'upcoming',
        new Date(2026, 8, 1, 12, 0),
      ),
    ).toEqual([future]);
  });

  it('drops a recurring series whose occurrences are all past', () => {
    expect(
      applyAgendaWindowFilter(
        [weeklySeries()],
        'upcoming',
        new Date(2026, 9, 1, 12, 0),
      ),
    ).toEqual([]);
  });

  it('keeps a recurring series with an in-window occurrence as one row', () => {
    const filtered = applyAgendaWindowFilter(
      [weeklySeries()],
      'upcoming',
      new Date(2026, 8, 1, 12, 0),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toEqual(weeklySeries());
  });

  it('keeps a series straddling now (past and future occurrences) as one row', () => {
    // Series runs Sep 8, 15, 22; now sits between the second and third
    // occurrence — the row must be kept (future occurrence) and stay a
    // single row.
    const filtered = applyAgendaWindowFilter(
      [weeklySeries()],
      'upcoming',
      new Date(2026, 8, 18, 12, 0),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toEqual(weeklySeries());
  });

  it('keeps a series with an in-progress occurrence on the current list', () => {
    // Occurrence of Sep 15 runs 16:00–17:00; now is mid-occurrence.
    const filtered = applyAgendaWindowFilter(
      [weeklySeries()],
      'current',
      new Date(2026, 8, 15, 16, 30, 0),
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0]).toEqual(weeklySeries());
  });

  it('drops a recurring series that is cancelled for its remaining occurrences', () => {
    const third = new Date(2026, 8, 22, 16, 0, 0, 0);
    expect(
      applyAgendaWindowFilter(
        [
          weeklySeries([
            { recurrenceId: third.toISOString(), cancelled: true },
          ]),
        ],
        'upcoming',
        new Date(2026, 8, 16, 12, 0),
      ),
    ).toEqual([]);
  });

  it('keeps a series whose rows straddle two pages in-window exactly once', () => {
    // Regression: the agenda selector runs the filter over the accumulated,
    // deduplicated rows (the whole InfiniteData — uniquePosts first, then
    // the window filter), so a series spanning pages is evaluated as a
    // whole and never yields two rows.
    const series = weeklySeries();
    const rows = applyAgendaWindowFilter(
      uniquePosts([[series], [series]]),
      'upcoming',
      new Date(2026, 8, 18, 12, 0),
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toEqual(series);
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
