import * as React from 'react';
import { dateFormatter } from './formatter';

export interface UpdatingDateProps {
  date: string | Date | number;
  formatter?: (date: string | Date | number) => string;
  /** Refresh interval in ms. Defaults to 60s. */
  intervalMs?: number;
}

/** Translation of UpdatingDate.svelte — re-renders every `intervalMs` ms. */
export function UpdatingDate({
  date,
  formatter = dateFormatter,
  intervalMs = 60_000,
}: UpdatingDateProps) {
  const [formatted, setFormatted] = React.useState(() => formatter(date));

  React.useEffect(() => {
    setFormatted(formatter(date));
    const handle = setInterval(() => {
      setFormatted(formatter(date));
    }, intervalMs);
    return () => clearInterval(handle);
  }, [date, formatter, intervalMs]);

  return <>{formatted}</>;
}
