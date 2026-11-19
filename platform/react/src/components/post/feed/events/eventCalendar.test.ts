import { describe, expect, it } from 'vitest';
import type {
  EventOccurrenceException,
  PublicPost,
} from '@openpeepshq/common/types';
import {
  agendaCoversRange,
  calendarRowInWindow,
  eventDayKeys,
  expandRecurringAgendaPosts,
  applyAgendaWindowFilter,
  groupPostsByDay,
  monthCells,
  monthWindow,
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

describe('calendarRowInWindow (range-feed calendar guard, issue #2131)', () => {
  // now sits mid-day on July 31 so the "implied hour" and "in-progress"
  // fixtures (all July 31) are judged against a matching clock.
  const pastNow = new Date(2026, 7, 31, 12, 0, 0, 0);

  const occurrenceRow = (
    start: string,
    end: string | undefined,
    recurrenceId?: string,
  ): PublicPost =>
    ({
      id: start,
      data: { type: 'event', start, end, name: 'Meet' },
      occurrenceStart: start,
      ...(end ? { occurrenceEnd: end } : {}),
      ...(recurrenceId ? { occurrenceRecurrenceId: recurrenceId } : {}),
    }) as PublicPost;

  it('drops an occurrence row that ended before now on the upcoming window', () => {
    const row = occurrenceRow(
      new Date(2026, 7, 15, 10, 0, 0, 0).toISOString(),
      new Date(2026, 7, 15, 11, 0, 0, 0).toISOString(),
    );
    expect(calendarRowInWindow(row, 'upcoming', pastNow)).toBe(false);
  });

  it('keeps a future occurrence row on the upcoming window', () => {
    const row = occurrenceRow(
      new Date(2026, 8, 20, 10, 0, 0, 0).toISOString(),
      new Date(2026, 8, 20, 11, 0, 0, 0).toISOString(),
    );
    expect(calendarRowInWindow(row, 'upcoming', pastNow)).toBe(true);
  });

  it('keeps a started occurrence without an end on upcoming until the implied hour passes', () => {
    const row = occurrenceRow(
      new Date(2026, 7, 31, 11, 40, 0, 0).toISOString(),
    );
    expect(calendarRowInWindow(row, 'upcoming', pastNow)).toBe(true);
  });

  it('keeps an in-progress occurrence on the current window', () => {
    const row = occurrenceRow(
      new Date(2026, 7, 31, 11, 0, 0, 0).toISOString(),
      new Date(2026, 7, 31, 13, 0, 0, 0).toISOString(),
    );
    expect(calendarRowInWindow(row, 'current', pastNow)).toBe(true);
  });

  it('keeps an ended occurrence on the past window and drops a future one', () => {
    const past = occurrenceRow(
      new Date(2026, 7, 15, 10, 0, 0, 0).toISOString(),
      new Date(2026, 7, 15, 11, 0, 0, 0).toISOString(),
    );
    const future = occurrenceRow(
      new Date(2026, 8, 20, 10, 0, 0, 0).toISOString(),
      new Date(2026, 8, 20, 11, 0, 0, 0).toISOString(),
    );
    expect(calendarRowInWindow(past, 'past', pastNow)).toBe(true);
    expect(calendarRowInWindow(future, 'past', pastNow)).toBe(false);
  });

  it('judges the row occurrence, not the series, on the upcoming window', () => {
    // A recurring series that still has an upcoming occurrence, but the
    // range-feed row is one of its already-ended occurrences. The calendar
    // must drop the old row — while the series-level list guard keeps the
    // same row, because a future occurrence of the series matches the window.
    const data = {
      type: 'event',
      name: 'Meet',
      start: new Date(2026, 7, 15, 10, 0, 0, 0).toISOString(),
      end: new Date(2026, 7, 15, 11, 0, 0, 0).toISOString(),
      recurrence: { freq: 'WEEKLY' as const, count: 4 },
    };
    const oldOccurrenceRow = {
      id: 'series-22',
      data,
      occurrenceRecurrenceId: new Date(2026, 7, 22, 10, 0, 0, 0).toISOString(),
      occurrenceStart: new Date(2026, 7, 22, 10, 0, 0, 0).toISOString(),
      occurrenceEnd: new Date(2026, 7, 22, 11, 0, 0, 0).toISOString(),
    } as PublicPost;
    const now = new Date(2026, 8, 1, 12, 0, 0, 0);
    expect(calendarRowInWindow(oldOccurrenceRow, 'upcoming', now)).toBe(false);
    // The series-level guard expands the whole series (Sep 15, 22, 29 and
    // the upcoming Aug 5 occurrence) and keeps the row on that basis.
    expect(
      applyAgendaWindowFilter([oldOccurrenceRow], 'upcoming', now),
    ).toHaveLength(1);
  });

  // Whole-day rows (data.wholeDay) use local-midnight alignment plus a
  // 24-hour implied end instead of the timed events' one-hour one — the
  // branch the round-3 rework of #2159 hardened for communities west of
  // UTC. The range feed delivers their occurrence times as midnight-UTC
  // ISO stamps (`normalizeComputedDatetime`); the fixtures use ymd dates
  // relative to `pastNow` (Aug 31 mid-day).
  const wholeDayRow = (startYmd: string, endYmd?: string): PublicPost => {
    const start = `${startYmd}T00:00:00.000Z`;
    const end = endYmd ? `${endYmd}T00:00:00.000Z` : undefined;
    return {
      id: `whole-${startYmd}`,
      data: { type: 'event', start, end, wholeDay: true, name: 'Meet' },
      occurrenceStart: start,
      ...(end ? { occurrenceEnd: end } : {}),
    } as PublicPost;
  };

  it('drops a whole-day row that ended before now on the upcoming window', () => {
    // Explicit inclusive last day (Aug 15): the window end is local
    // midnight after it, so the row is past by now (Aug 31 mid-day).
    const row = wholeDayRow('2026-08-14', '2026-08-15');
    expect(calendarRowInWindow(row, 'upcoming', pastNow)).toBe(false);
    expect(calendarRowInWindow(row, 'past', pastNow)).toBe(true);
  });

  it('drops a whole-day row whose implicit last day is over on upcoming', () => {
    // No explicit end: the implied end is local midnight after the last
    // day (the start of Aug 31), so the row is past mid-day on Aug 31.
    const row = wholeDayRow('2026-08-30');
    expect(calendarRowInWindow(row, 'upcoming', pastNow)).toBe(false);
  });

  it('keeps a whole-day row covering today on upcoming and current', () => {
    // Whole-day rows store the inclusive last day: end == start for a
    // single-day event, so the window end is local midnight after today.
    const row = wholeDayRow('2026-08-31', '2026-08-31');
    expect(calendarRowInWindow(row, 'upcoming', pastNow)).toBe(true);
    expect(calendarRowInWindow(row, 'current', pastNow)).toBe(true);
    expect(calendarRowInWindow(row, 'past', pastNow)).toBe(false);
  });

  it('keeps a whole-day row that ends on its last future day on upcoming', () => {
    // A multi-day row whose inclusive last day (Sep 1) has not finished
    // yet stays on upcoming until local midnight after Sep 1.
    const row = wholeDayRow('2026-08-31', '2026-09-01');
    expect(calendarRowInWindow(row, 'upcoming', pastNow)).toBe(true);
    // And it moves to the past window only after its last day.
    expect(
      calendarRowInWindow(row, 'past', new Date(2026, 8, 2, 0, 30, 0, 0)),
    ).toBe(true);
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

describe('monthWindow', () => {
  it('covers the padded grid from the first cell midnight to the day after the last', () => {
    // The local window must match the local day keys of the padded grid so a
    // UTC-shifted browser still fetches every local day the grid shows.
    const cells = monthCells(2026, 8);
    const { from, to } = monthWindow(2026, 8);
    expect(new Date(from).toISOString()).toBe(
      new Date(2026, 7, Number(cells[0]!.key.slice(8, 10))).toISOString(),
    );
    expect(new Date(to).toISOString()).toBe(
      new Date(
        2026,
        9,
        Number(cells.at(-1)!.key.slice(8, 10)) + 1,
      ).toISOString(),
    );
  });
});

describe('uniquePosts', () => {
  it('drops duplicate occurrence rows across range pages', () => {
    const a = eventPost('2026-09-08T16:00:00.000Z');
    const recurring = { ...a, occurrenceRecurrenceId: a.occurrenceStart };
    expect(uniquePosts([[a, recurring], [recurring]])).toHaveLength(2);
  });
});

describe('groupPostsByDay', () => {
  const dayKeys = (posts: PublicPost[]): string[] => [
    ...groupPostsByDay(posts).keys(),
  ];

  it('places each occurrence row on its own local date', () => {
    expect(
      dayKeys([
        eventPost('2026-09-08T16:00:00.000Z', '2026-09-08T17:00:00.000Z'),
        eventPost('2026-09-15T16:00:00.000Z', '2026-09-15T17:00:00.000Z'),
        eventPost('2026-09-22T16:00:00.000Z', '2026-09-22T17:00:00.000Z'),
      ]),
    ).toEqual(['2026-09-08', '2026-09-15', '2026-09-22']);
  });

  it('lists every occurrence of a series on its date', () => {
    const first = eventPost('2026-09-08T16:00:00.000Z');
    const second = eventPost('2026-09-15T16:00:00.000Z');
    const rows = [
      { ...second, occurrenceRecurrenceId: second.occurrenceStart },
      { ...first, occurrenceRecurrenceId: first.occurrenceStart },
    ] as PublicPost[];
    expect([...dayKeys(rows)].sort()).toEqual(['2026-09-08', '2026-09-15']);
  });

  it('spans a multi-day event across each local day it touches', () => {
    const start = new Date(2026, 8, 23, 22, 0);
    const end = new Date(2026, 8, 25, 10, 0);
    expect(
      dayKeys([eventPost(start.toISOString(), end.toISOString())]),
    ).toEqual(['2026-09-23', '2026-09-24', '2026-09-25']);
  });

  it('sorts a day bucket by start time', () => {
    const late = eventPost('2026-09-08T18:00:00.000Z');
    const early = eventPost('2026-09-08T09:00:00.000Z');
    const bucket = groupPostsByDay([late, early]).get('2026-09-08') ?? [];
    expect(bucket.map((post) => post.id)).toEqual([
      '2026-09-08T09:00:00.000Z',
      '2026-09-08T18:00:00.000Z',
    ]);
  });

  it('drops day buckets outside the rendered window', () => {
    const window = monthWindow(2026, 8);
    const inWindow = eventPost('2026-09-08T16:00:00.000Z');
    const overflow = eventPost('2026-07-04T16:00:00.000Z');
    expect([...groupPostsByDay([inWindow, overflow], window).keys()]).toEqual([
      '2026-09-08',
    ]);
  });
});
