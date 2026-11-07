import * as React from 'react';
import { dateFormatter } from './formatter';

export interface UpdatingDateProps {
  date: string | Date | number;
  formatter?: (date: string | Date | number) => string;
}

/**
 * Translation of UpdatingDate.svelte — re-renders when the displayed value
 * can change: the next tick is scheduled at the moment the time since
 * `date` crosses the next minute boundary, instead of polling on a fixed
 * interval.
 */
export function UpdatingDate({
  date,
  formatter = dateFormatter,
}: UpdatingDateProps) {
  const [formatted, setFormatted] = React.useState(() => formatter(date));

  React.useEffect(() => {
    const dateMs =
      date instanceof Date ? date.getTime() : new Date(date).getTime();
    setFormatted(formatter(date));
    if (!Number.isFinite(dateMs)) return;
    const msUntilNextMinute = () => 60_000 - ((Date.now() - dateMs) % 60_000);
    let handle: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      setFormatted(formatter(date));
      handle = setTimeout(tick, msUntilNextMinute());
    };
    handle = setTimeout(tick, msUntilNextMinute());
    return () => clearTimeout(handle);
  }, [date, formatter]);

  return <>{formatted}</>;
}
