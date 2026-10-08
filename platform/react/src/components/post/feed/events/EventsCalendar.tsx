import { ChevronLeft, ChevronRight } from 'lucide-react';
import type { PublicPost } from '@openpeepshq/common/types';
import { cn, LoadingSpinner } from '@openpeepshq/react-ui';
import { useT } from '../../../../i18n';
import {
  dayNumber,
  eventName,
  useEventsCalendar,
} from '../../../../hooks/events/useEventsCalendar';
import type { EventsFeedQuery } from './EventsFeed';
import {
  eventEndIso,
  eventStartIso,
  type EventsAgendaWindow,
} from './eventCalendar';

const eventHref = (post: PublicPost): string =>
  post.occurrenceRecurrenceId
    ? `/posts/${post.id}?occurrence=${encodeURIComponent(post.occurrenceRecurrenceId)}`
    : `/posts/${post.id}`;

export interface EventsCalendarProps {
  query: EventsFeedQuery;
  agenda: EventsAgendaWindow;
}

export const EventsCalendar = ({ query, agenda }: EventsCalendarProps) => {
  const t = useT();
  const {
    cells,
    byDay,
    todayKey,
    selected,
    selectedEvents,
    selectedLabel,
    setSelectedKey,
    monthLabel,
    weekdayLabels,
    isLoading,
    isFetchingNextPage,
    shiftMonth,
    goToday,
  } = useEventsCalendar(query, agenda);

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
        <h3 className="mb-2 text-sm font-semibold">{selectedLabel}</h3>
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
