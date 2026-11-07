import React, { useEffect } from 'react';
import { dateFormatter } from './formatter';
import { ThemedText } from '../../ui/themed-text';
import { cn } from '../../../lib/utils';

interface UpdatingDateProps {
  date: string | Date | number;
  formatter?: (date: string | Date | number) => string;
  className?: string;
}

export const UpdatingDate = ({
  date,
  formatter = dateFormatter,
  className,
}: UpdatingDateProps) => {
  const [formattedDate, setFormattedDate] = React.useState(formatter(date));

  useEffect(() => {
    // Tick when the displayed value can change: at the next minute
    // boundary of the time since `date`, instead of polling every 60s.
    const dateMs =
      date instanceof Date ? date.getTime() : new Date(date).getTime();
    setFormattedDate(formatter(date));
    if (!Number.isFinite(dateMs)) return;
    const msUntilNextMinute = () => 60_000 - ((Date.now() - dateMs) % 60_000);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      setFormattedDate(formatter(date));
      handle = setTimeout(tick, msUntilNextMinute());
    };
    handle = setTimeout(tick, msUntilNextMinute());
    return () => clearTimeout(handle);
  }, [date, formatter]);

  return (
    <ThemedText className={cn('text-sm', className)}>
      {formattedDate}
    </ThemedText>
  );
};
