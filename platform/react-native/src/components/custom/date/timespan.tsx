import React from 'react';
import {ThemedText} from '~/components/ui/themed-text';

interface TimespanProps {
  start: string;
  end?: string;
  timeZone?: string;
  truncate?: number;
}

export const Timespan = ({
  start,
  end,
  truncate,
  timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone,
}: TimespanProps) => {
  const startDate = new Date(start);
  const endDate = end && new Date(end);

  const startDateString = startDate.toLocaleDateString(undefined, {
    timeZone,
    dateStyle: 'full',
  });
  const startTimeString = startDate.toLocaleTimeString(undefined, {
    timeZone,
    timeStyle: 'short',
  });

  const endDateString =
    endDate &&
    endDate.toLocaleDateString(undefined, {timeZone, dateStyle: 'full'});

  const endTimeString =
    endDate &&
    endDate.toLocaleTimeString(undefined, {timeZone, timeStyle: 'short'});

  const isSameDay = startDateString === endDateString;

  const formattedTimespan = endDateString
    ? isSameDay
      ? `${startDateString}, ${startTimeString} - ${endTimeString}`
      : `${startDateString}, ${startTimeString} - ${endDateString}, ${endTimeString}`
    : `${startDateString}, ${startTimeString}`;

  const truncateText = (v: string) =>
    truncate ? `${v.substring(0, truncate)}...` : v;

  return <ThemedText>{truncateText(formattedTimespan)}</ThemedText>;
};
