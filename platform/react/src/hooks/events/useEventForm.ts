import { useState } from 'react';
import type {
  AudienceSetting,
  Event,
  EventRecurrence,
  PostCreationData,
  RecurrenceFreq,
  RecurrenceWeekday,
} from '@openpeepshq/common/types';
import {
  isEndBeforeStart,
  previewUpcomingOccurrences,
  reinterpretIsoInTimeZone,
  weekdayFromDate,
  withoutEventMaxAttendees,
} from '@openpeepshq/common/lib';
import { useCurrentProfile } from '../../components/layout/IdentityContext';
import { applyAudienceSetting } from '../../lib/audienceSetting';

export const EVENT_WEEKDAYS: RecurrenceWeekday[] = [
  'MO',
  'TU',
  'WE',
  'TH',
  'FR',
  'SA',
  'SU',
];

export type RepeatFreq = RecurrenceFreq | 'none';
export type RepeatEnd = 'never' | 'until' | 'count';

/** Controlled-form state transitions for an event post; UI only renders. */
export const useEventForm = (
  postData: PostCreationData,
  onChange: (data: PostCreationData) => void,
) => {
  const me = useCurrentProfile();
  const event = postData.data as Event;
  const eventTimeZone =
    event.timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone;
  const [showEndDate, setShowEndDate] = useState(event.end !== undefined);
  // Transient until the next successful patch; the persisted range itself is
  // derived from start/end, which also covers events saved before the guard.
  const [rejectedTimes, setRejectedTimes] = useState(false);

  const patchEvent = (patch: Partial<Event>) => {
    let next: Event = { ...event, ...patch };
    if ('maxAttendees' in patch && patch.maxAttendees === undefined) {
      next = withoutEventMaxAttendees(next);
    }
    setRejectedTimes(false);
    onChange({ ...postData, data: next });
  };

  const changeStart = (start: string | undefined) => {
    if (!start) return;
    // Moving the start past the end keeps the duration by shifting the end.
    if (isEndBeforeStart(start, event.end) && event.start && event.end) {
      const delta = new Date(start).getTime() - new Date(event.start).getTime();
      const end = new Date(new Date(event.end).getTime() + delta);
      patchEvent({ start, end: end.toISOString() });
      return;
    }
    patchEvent({ start });
  };

  const changeEnd = (end: string | undefined) => {
    if (isEndBeforeStart(event.start, end)) {
      setRejectedTimes(true);
      return;
    }
    patchEvent({ end });
  };

  const setEvent = (next: Event) => {
    setRejectedTimes(false);
    onChange({ ...postData, data: next });
  };

  const setAudience = (settings: AudienceSetting) =>
    onChange(applyAudienceSetting(postData, settings, me));

  const setRecurrence = (recurrence: EventRecurrence | undefined) =>
    patchEvent({ recurrence });

  const repeatFreq: RepeatFreq = event.recurrence?.freq ?? 'none';
  const repeatEnd: RepeatEnd = event.recurrence?.until
    ? 'until'
    : event.recurrence?.count
      ? 'count'
      : 'never';
  const preview = event.recurrence ? previewUpcomingOccurrences(event, 3) : [];

  const applyFreq = (freq: RepeatFreq) => {
    if (freq === 'none') {
      setRecurrence(undefined);
      return;
    }
    const next: EventRecurrence = {
      freq,
      interval: event.recurrence?.interval,
      until: event.recurrence?.until,
      count: event.recurrence?.count,
    };
    if (freq === 'WEEKLY') {
      next.byDay = event.recurrence?.byDay?.length
        ? event.recurrence.byDay
        : event.start
          ? [weekdayFromDate(new Date(event.start))]
          : ['MO'];
    }
    setRecurrence(next);
  };

  const toggleWeekday = (day: RecurrenceWeekday) => {
    if (!event.recurrence) return;
    const current = event.recurrence.byDay ?? [];
    const next = current.includes(day)
      ? current.filter((value) => value !== day)
      : [...current, day];
    setRecurrence({
      ...event.recurrence,
      byDay: next.length > 0 ? next : [weekdayFromDate(new Date(event.start))],
    });
  };

  const applyRepeatEnd = (mode: RepeatEnd) => {
    if (!event.recurrence) return;
    if (mode === 'never') {
      setRecurrence({
        ...event.recurrence,
        until: undefined,
        count: undefined,
      });
    } else if (mode === 'until') {
      setRecurrence({
        ...event.recurrence,
        count: undefined,
        until:
          event.recurrence.until ??
          new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(),
      });
    } else {
      setRecurrence({
        ...event.recurrence,
        until: undefined,
        count: event.recurrence.count ?? 10,
      });
    }
  };

  const setRepeatUntil = (until: string | undefined) => {
    if (!event.recurrence) return;
    setRecurrence({ ...event.recurrence, until, count: undefined });
  };

  const setRepeatCount = (raw: string | number) => {
    if (!event.recurrence) return;
    setRecurrence({
      ...event.recurrence,
      count: Math.max(1, Number(raw) || 1),
      until: undefined,
    });
  };

  const toggleEndDate = (checked: boolean) => {
    setShowEndDate(checked);
    if (checked && event.start) {
      const end = new Date(event.start);
      end.setHours(end.getHours() + 1);
      patchEvent({ end: end.toISOString() });
    } else {
      patchEvent({ end: undefined });
    }
  };

  /** Keeps wall-clock times when the zone changes. */
  const setTimeZone = (timeZone: string) =>
    patchEvent({
      timeZone,
      start:
        reinterpretIsoInTimeZone(event.start, eventTimeZone, timeZone) ??
        event.start,
      end: reinterpretIsoInTimeZone(event.end, eventTimeZone, timeZone),
      ...(event.recurrence?.until
        ? {
            recurrence: {
              ...event.recurrence,
              until: reinterpretIsoInTimeZone(
                event.recurrence.until,
                eventTimeZone,
                timeZone,
              ),
            },
          }
        : {}),
    });

  return {
    event,
    eventTimeZone,
    showEndDate,
    repeatFreq,
    repeatEnd,
    preview,
    endBeforeStart: rejectedTimes || isEndBeforeStart(event.start, event.end),
    changeStart,
    changeEnd,
    patchEvent,
    setEvent,
    setAudience,
    setRecurrence,
    applyFreq,
    toggleWeekday,
    applyRepeatEnd,
    setRepeatUntil,
    setRepeatCount,
    toggleEndDate,
    setTimeZone,
  };
};
