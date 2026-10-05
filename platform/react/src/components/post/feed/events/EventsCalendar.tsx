import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { cn, LoadingSpinner } from '@openpeepshq/react-ui';
import { useT } from '../../../../i18n';
import type { EventsFeedQuery } from './EventsFeed';
import {
  endOfMonth,
  eventEndIso,
  eventStartIso,
  groupPostsByDay,
  localDateKey,
  monthCells,
  shouldFetchMoreAgenda,
  startOfMonth,
  uniquePosts,
  type EventsAgendaWindow,
} from './eventCalendar';

const WEEKDAY_START = new Date(2026, 0, 4);

const eventHref = (post: PublicPost): string =>
  post.occurrenceRecurrenceId
    ? `/posts/${post.id}?occurrence=${encodeURIComponent(post.occurrenceRecurrenceId)}`
    : `/posts/${post.id}`;

const eventName = (post: PublicPost): string =>
  post.data.type === 'event' ? post.data.name?.trim() || '-' : '-';

const dayNumber = (key: string): string => String(Number(key.slice(8, 10)));

export interface EventsCalendarProps {
  query: EventsFeedQuery;
  agenda: EventsAgendaWindow;
}

export const EventsCalendar = ({ query, agenda }: EventsCalendarProps) => {
  const t = useT();
  const initial = new Date();
  const [cursor, setCursor] = useState({
    year: initial.getFullYear(),
    month: initial.getMonth(),
  });
  const [selectedKey, setSelectedKey] = useState(localDateKey(initial));

  const posts = useMemo(
    () => uniquePosts(query.data?.pages),
    [query.data?.pages],
  );
  const byDay = useMemo(() => groupPostsByDay(posts), [posts]);
  const cells = useMemo(
    () => monthCells(cursor.year, cursor.month),
    [cursor.year, cursor.month],
  );
  const inMonthKeys = cells
    .filter((cell) => cell.inMonth)
    .map((cell) => cell.key);
  const todayKey = localDateKey(new Date());
  const visible = cells.some((cell) => cell.key === selectedKey);
  const selected = visible
    ? selectedKey
    : inMonthKeys.includes(todayKey)
      ? todayKey
      : (inMonthKeys[0] ?? todayKey);
  const selectedEvents = byDay.get(selected) ?? [];
  const monthLabel = new Date(cursor.year, cursor.month, 1).toLocaleDateString(
    undefined,
    { month: 'long', year: 'numeric' },
  );
  const weekdayLabels = Array.from({ length: 7 }, (_, index) =>
    new Date(
      WEEKDAY_START.getFullYear(),
      WEEKDAY_START.getMonth(),
      WEEKDAY_START.getDate() + index,
    ).toLocaleDateString(undefined, { weekday: 'short' }),
  );

  const {
    hasNextPage,
    isLoading,
    isFetchingNextPage,
    isError,
    fetchNextPage,
    data,
  } = query;

  useEffect(() => {
    if (isLoading || isFetchingNextPage || isError) return;
    const fetchMore = shouldFetchMoreAgenda({
      window: agenda,
      starts: posts.map(eventStartIso),
      rangeStart: startOfMonth(cursor.year, cursor.month),
      rangeEnd: endOfMonth(cursor.year, cursor.month),
      hasNextPage: !!hasNextPage,
      pagesLoaded: data?.pages.length ?? 0,
    });
    if (fetchMore) void fetchNextPage();
  }, [
    cursor.month,
    cursor.year,
    data?.pages.length,
    fetchNextPage,
    hasNextPage,
    isError,
    isFetchingNextPage,
    isLoading,
    agenda,
    posts,
  ]);

  const shiftMonth = (delta: number) => {
    const next = new Date(cursor.year, cursor.month + delta, 1);
    setCursor({ year: next.getFullYear(), month: next.getMonth() });
  };

  const goToday = () => {
    const now = new Date();
    setCursor({ year: now.getFullYear(), month: now.getMonth() });
    setSelectedKey(localDateKey(now));
  };

  if (isLoading) {
    return (
      <div className="text-muted-foreground flex h-32 items-center justify-center text-sm">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div data-testid="events-calendar">
      <div className="mb-3 flex items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">{monthLabel}</h2>
        <div className="flex items-center gap-1">
          {isFetchingNextPage ? <LoadingSpinner /> : null}
          <button
            type="button"
            className="text-muted-foreground hover:text-foreground px-2 py-1 text-sm"
            onClick={goToday}
          >
            {t('events.calendar.today', { defaultValue: 'Today' })}
          </button>
          <button
            type="button"
            className="hover:bg-surface-2 rounded-md p-1"
            aria-label={t('events.calendar.previousMonth', {
              defaultValue: 'Previous month',
            })}
            onClick={() => shiftMonth(-1)}
          >
            <ChevronLeft className="size-5" />
          </button>
          <button
            type="button"
            className="hover:bg-surface-2 rounded-md p-1"
            aria-label={t('events.calendar.nextMonth', {
              defaultValue: 'Next month',
            })}
            onClick={() => shiftMonth(1)}
          >
            <ChevronRight className="size-5" />
          </button>
        </div>
      </div>

      <div
        role="grid"
        aria-label={monthLabel}
        className="border-border overflow-hidden rounded-md border"
      >
        <div className="bg-surface grid grid-cols-7" role="row">
          {weekdayLabels.map((label, index) => (
            <div
              key={`${label}-${index}`}
              role="columnheader"
              className="text-muted-foreground px-1 py-2 text-center text-xs"
            >
              {label}
            </div>
          ))}
        </div>
        <div className="bg-border grid grid-cols-7 gap-px">
          {cells.map((cell) => {
            const dayEvents = byDay.get(cell.key) ?? [];
            const shown = dayEvents.slice(0, 2);
            const hidden = dayEvents.length - shown.length;
            const isSelected = cell.key === selected;
            return (
              <div
                key={cell.key}
                role="gridcell"
                aria-selected={isSelected}
                className={cn(
                  'bg-background min-h-16 min-w-0 overflow-hidden p-1 sm:min-h-24',
                  isSelected && 'bg-primary/10',
                  !cell.inMonth && 'opacity-60',
                )}
              >
                <button
                  type="button"
                  className="mb-1"
                  aria-current={cell.key === todayKey ? 'date' : undefined}
                  onClick={() => setSelectedKey(cell.key)}
                >
                  <span
                    className={cn(
                      'inline-flex size-6 items-center justify-center rounded-full text-xs',
                      cell.key === todayKey &&
                        'bg-primary text-primary-foreground',
                      !cell.inMonth && 'text-muted-foreground',
                    )}
                  >
                    {dayNumber(cell.key)}
                  </span>
                </button>
                <ul className="space-y-0.5">
                  {shown.map((post) => (
                    <li key={`${post.id}:${post.occurrenceRecurrenceId ?? ''}`}>
                      <a
                        href={eventHref(post)}
                        title={eventName(post)}
                        className="bg-primary/15 text-primary block truncate rounded px-1 text-xs"
                      >
                        {eventName(post)}
                      </a>
                    </li>
                  ))}
                </ul>
                {hidden > 0 ? (
                  <button
                    type="button"
                    className="text-muted-foreground mt-0.5 text-xs hover:underline"
                    onClick={() => setSelectedKey(cell.key)}
                  >
                    {t('events.calendar.more', {
                      count: hidden,
                      defaultValue: '+{{count}} more',
                    })}
                  </button>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      <section className="mt-4" aria-live="polite">
        <h3 className="mb-2 text-sm font-semibold">
          {new Date(
            Number(selected.slice(0, 4)),
            Number(selected.slice(5, 7)) - 1,
            Number(selected.slice(8, 10)),
          ).toLocaleDateString(undefined, {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </h3>
        {selectedEvents.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            {t('events.calendar.emptyDay', { defaultValue: 'No events' })}
          </p>
        ) : (
          <ul className="divide-border divide-y">
            {selectedEvents.map((post) => (
              <li key={`${post.id}:${post.occurrenceRecurrenceId ?? ''}`}>
                <a
                  href={eventHref(post)}
                  className="hover:bg-surface-2 flex items-baseline gap-3 rounded-md px-2 py-2"
                >
                  <EventTime post={post} />
                  <span className="font-medium">{eventName(post)}</span>
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
};

const EventTime = ({ post }: { post: PublicPost }) => {
  const t = useT();
  if (post.data.type === 'event' && post.data.wholeDay) {
    return (
      <span className="text-muted-foreground shrink-0 whitespace-nowrap text-sm">
        {t('events.calendar.allDay', { defaultValue: 'All day' })}
      </span>
    );
  }
  const startIso = eventStartIso(post);
  const start = startIso ? new Date(startIso) : undefined;
  const endIso = eventEndIso(post);
  const end = endIso ? new Date(endIso) : undefined;
  const time = start
    ? start.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      })
    : '';
  const endTime =
    end && start && end.getTime() !== start.getTime()
      ? end.toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';
  return (
    <span className="text-muted-foreground shrink-0 whitespace-nowrap text-sm">
      {endTime ? `${time} – ${endTime}` : time}
    </span>
  );
};
