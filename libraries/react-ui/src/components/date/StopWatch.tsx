import * as React from 'react';
import { stopWatchFormatter } from './formatter';

export interface StopWatchProps {
  start: string | Date | number;
  formatter?: (duration: number) => string;
  intervalMs?: number;
}

export function StopWatch({
  start,
  formatter = stopWatchFormatter,
  intervalMs = 1000,
}: StopWatchProps) {
  const [text, setText] = React.useState(() =>
    formatter(Date.now() - new Date(start).getTime()),
  );

  React.useEffect(() => {
    setText(formatter(Date.now() - new Date(start).getTime()));
    const handle = setInterval(() => {
      setText(formatter(Date.now() - new Date(start).getTime()));
    }, intervalMs);
    return () => clearInterval(handle);
  }, [start, formatter, intervalMs]);

  return <>{text}</>;
}
