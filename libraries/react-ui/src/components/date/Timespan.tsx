import * as React from 'react';

export interface TimespanProps {
  start: string;
  end?: string;
  timeZone?: string;
  truncate?: number;
}

export function Timespan({ start, end, timeZone, truncate }: TimespanProps) {
  const userTimeZone = React.useMemo(
    () =>
      typeof window !== 'undefined'
        ? Intl.DateTimeFormat().resolvedOptions().timeZone
        : 'UTC',
    [],
  );
  const effectiveTimeZone = timeZone || userTimeZone;
  const startDate = new Date(start);
  const endDate = end ? new Date(end) : undefined;

  const startDateString = startDate.toLocaleDateString(undefined, {
    timeZone: effectiveTimeZone,
    dateStyle: 'full',
  });
  const startTimeString = startDate.toLocaleTimeString(undefined, {
    timeZone: effectiveTimeZone,
    timeStyle: 'short',
  });

  const endDateString = endDate?.toLocaleDateString(undefined, {
    timeZone: effectiveTimeZone,
    dateStyle: 'full',
  });
  const endTimeString = endDate?.toLocaleTimeString(undefined, {
    timeZone: effectiveTimeZone,
    timeStyle: 'short',
  });

  const isSameDay = endDateString && startDateString === endDateString;

  const formatted = endDateString
    ? isSameDay
      ? `${startDateString}, ${startTimeString} - ${endTimeString}`
      : `${startDateString}, ${startTimeString} - ${endDateString}, ${endTimeString}`
    : `${startDateString}, ${startTimeString}`;

  return <>{truncate ? `${formatted.substring(0, truncate)}...` : formatted}</>;
}
