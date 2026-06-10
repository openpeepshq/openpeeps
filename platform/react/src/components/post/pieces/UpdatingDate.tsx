import { useEffect, useState } from 'react';

export interface UpdatingDateProps {
  date: string | Date;
  /** Re-render interval in ms (default 30s). */
  intervalMs?: number;
}

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;

const relative = (then: Date): string => {
  const diff = Date.now() - then.getTime();
  if (diff < MINUTE) return 'just now';
  if (diff < HOUR) return `${Math.floor(diff / MINUTE)}m`;
  if (diff < DAY) return `${Math.floor(diff / HOUR)}h`;
  if (diff < WEEK) return `${Math.floor(diff / DAY)}d`;
  return then.toLocaleDateString();
};

/**
 * Translation of `@openpeeps/ui` `UpdatingDate.svelte`: renders a relative time
 * string and re-renders periodically so labels stay fresh.
 */
export function UpdatingDate({ date, intervalMs = 30 * SECOND }: UpdatingDateProps) {
  const [, force] = useState(0);
  useEffect(() => {
    const id = setInterval(() => force((n) => n + 1), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  const parsed = typeof date === 'string' ? new Date(date) : date;
  return (
    <time
      dateTime={parsed.toISOString()}
      title={parsed.toLocaleString()}
    >
      {relative(parsed)}
    </time>
  );
}
