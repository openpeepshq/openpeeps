import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ChevronDown, ChevronRight } from 'lucide-react';
import type { ExpandedOccurrence } from '@openpeepshq/common/lib';
import { sameRecurrenceId } from '@openpeepshq/common/lib';
import { ScrollArea } from '@openpeepshq/react-ui';
import { useT } from '../../../i18n';

export interface EventOccurrenceListProps {
  postId: string;
  occurrences: ExpandedOccurrence[];
  currentOccurrenceId?: string;
  recurrenceLabel: string;
}

const formatOccurrenceStart = (start: string) =>
  new Date(start).toLocaleString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

const occurrencePath = (postId: string, recurrenceId?: string) =>
  recurrenceId
    ? `/posts/${postId}?occurrence=${encodeURIComponent(recurrenceId)}`
    : `/posts/${postId}`;

export const EventOccurrenceList = ({
  postId,
  occurrences,
  currentOccurrenceId,
  recurrenceLabel,
}: EventOccurrenceListProps) => {
  const t = useT();
  const [open, setOpen] = useState(false);
  const listId = `event-occurrence-list-${postId}`;

  if (occurrences.length === 0 && !currentOccurrenceId) {
    return (
      <div className="mt-4">
        <span className="text-muted-foreground text-sm">
          {t('events.repeat.label', { defaultValue: 'Repeats' })}
        </span>
        <p className="text-sm">{recurrenceLabel}</p>
      </div>
    );
  }

  return (
    <div className="mt-4">
      <button
        type="button"
        className="flex w-full items-start gap-2 text-left"
        aria-expanded={open}
        aria-controls={listId}
        onClick={() => setOpen((value) => !value)}
      >
        {open ? (
          <ChevronDown className="mt-0.5 size-4 shrink-0" />
        ) : (
          <ChevronRight className="mt-0.5 size-4 shrink-0" />
        )}
        <span>
          <span className="text-muted-foreground text-sm">
            {t('events.repeat.label', { defaultValue: 'Repeats' })}
          </span>
          <p className="text-sm">{recurrenceLabel}</p>
          <span className="text-muted-foreground text-xs">
            {open
              ? t('events.occurrence.hideDates', {
                  defaultValue: 'Hide upcoming dates',
                })
              : t('events.occurrence.showDates', {
                  defaultValue: 'Show upcoming dates',
                })}
          </span>
        </span>
      </button>
      {open ? (
        <ScrollArea className="mt-2 h-48" id={listId}>
          <ul className="pr-3 text-sm">
            {currentOccurrenceId ? (
              <li>
                <Link
                  to={occurrencePath(postId)}
                  className="hover:bg-muted block rounded px-2 py-1.5"
                >
                  {t('events.occurrence.viewSeries', {
                    defaultValue: 'All dates',
                  })}
                </Link>
              </li>
            ) : null}
            {occurrences.map((occurrence) => {
              const current = sameRecurrenceId(
                occurrence.recurrenceId,
                currentOccurrenceId,
              );
              const label = formatOccurrenceStart(occurrence.start);
              return (
                <li key={occurrence.recurrenceId}>
                  {current ? (
                    <span
                      aria-current="page"
                      className="bg-muted block rounded px-2 py-1.5 font-medium"
                    >
                      {label}
                    </span>
                  ) : (
                    <Link
                      to={occurrencePath(postId, occurrence.recurrenceId)}
                      className="hover:bg-muted block rounded px-2 py-1.5"
                    >
                      {label}
                    </Link>
                  )}
                </li>
              );
            })}
          </ul>
        </ScrollArea>
      ) : null}
    </div>
  );
};
