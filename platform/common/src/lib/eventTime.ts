const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

const partNumber = (
  parts: Intl.DateTimeFormatPart[],
  type: Intl.DateTimeFormatPartTypes,
): number => Number(parts.find((part) => part.type === type)?.value);

/** Milliseconds to add to UTC to get wall time in `timeZone` at `utcMs`. */
const tzOffsetMs = (utcMs: number, timeZone: string): number => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcMs));
  const hour = partNumber(parts, 'hour');
  const asUtc = Date.UTC(
    partNumber(parts, 'year'),
    partNumber(parts, 'month') - 1,
    partNumber(parts, 'day'),
    hour === 24 ? 0 : hour,
    partNumber(parts, 'minute'),
    partNumber(parts, 'second'),
  );
  return asUtc - utcMs;
};

const pad2 = (value: number): string => String(value).padStart(2, '0');

/**
 * Interpret a datetime-local wall clock (`YYYY-MM-DDTHH:mm`) in `timeZone`
 * and return a UTC ISO string.
 */
export const zonedDateTimeToUtcIso = (
  local: string,
  timeZone: string,
): string | undefined => {
  if (!local) return undefined;
  const match = DATETIME_LOCAL_RE.exec(local);
  if (!match) {
    const parsed = new Date(local);
    return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
  }

  const utcGuess = Date.UTC(
    Number(match[1]),
    Number(match[2]) - 1,
    Number(match[3]),
    Number(match[4]),
    Number(match[5]),
    Number(match[6] ?? 0),
  );

  try {
    const offset = tzOffsetMs(utcGuess, timeZone);
    const utcWithOffset = utcGuess - offset;
    const offsetAtResult = tzOffsetMs(utcWithOffset, timeZone);
    const utc =
      offsetAtResult === offset ? utcWithOffset : utcGuess - offsetAtResult;
    return new Date(utc).toISOString();
  } catch {
    return new Date(utcGuess).toISOString();
  }
};

/** Format a UTC ISO instant as a datetime-local string in `timeZone`. */
export const utcIsoToZonedDateTime = (
  iso: string,
  timeZone: string,
): string => {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(date);
    const hour = partNumber(parts, 'hour');
    const y = partNumber(parts, 'year');
    const month = pad2(partNumber(parts, 'month'));
    const day = pad2(partNumber(parts, 'day'));
    const hh = pad2(hour === 24 ? 0 : hour);
    const mm = pad2(partNumber(parts, 'minute'));
    return `${y}-${month}-${day}T${hh}:${mm}`;
  } catch {
    return '';
  }
};

/**
 * Keep the wall-clock time of `iso` (as seen in `fromTimeZone`) and express
 * that same clock time in `toTimeZone`.
 */
export const reinterpretIsoInTimeZone = (
  iso: string | undefined,
  fromTimeZone: string,
  toTimeZone: string,
): string | undefined => {
  if (!iso) return undefined;
  if (fromTimeZone === toTimeZone) return iso;
  const wall = utcIsoToZonedDateTime(iso, fromTimeZone);
  return wall ? zonedDateTimeToUtcIso(wall, toTimeZone) : iso;
};

/** Build a Date whose local components match `iso` as seen in `timeZone`. */
export const utcIsoToWallClockDate = (iso: string, timeZone: string): Date => {
  const local = utcIsoToZonedDateTime(iso, timeZone);
  if (!local) return new Date(iso);
  const [datePart, timePart] = local.split('T');
  const [year, month, day] = datePart.split('-').map(Number);
  const [hour, minute] = timePart.split(':').map(Number);
  return new Date(year, month - 1, day, hour, minute);
};

/** Treat `date`'s local components as wall time in `timeZone`. */
export const wallClockDateToUtcIso = (date: Date, timeZone: string): string => {
  const local = `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(
    date.getDate(),
  )}T${pad2(date.getHours())}:${pad2(date.getMinutes())}`;
  return zonedDateTimeToUtcIso(local, timeZone) ?? date.toISOString();
};

export const formatEventWhen = (
  start: string,
  options?: {
    end?: string | null;
    timeZone?: string | null;
    allDay?: boolean;
    locale?: string;
  },
): string => {
  const timeZone = options?.timeZone || undefined;
  const dateOptions: Intl.DateTimeFormatOptions = {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...(timeZone ? { timeZone } : {}),
  };
  if (options?.allDay) {
    const startLabel = new Date(start).toLocaleDateString(
      options.locale,
      dateOptions,
    );
    if (!options.end) return startLabel;
    const endLabel = new Date(options.end).toLocaleDateString(
      options.locale,
      dateOptions,
    );
    return `${startLabel} – ${endLabel}`;
  }

  const dateTimeOptions: Intl.DateTimeFormatOptions = {
    ...dateOptions,
    hour: '2-digit',
    minute: '2-digit',
    ...(timeZone ? { timeZoneName: 'short' } : {}),
  };
  const startLabel = new Date(start).toLocaleString(
    options?.locale,
    dateTimeOptions,
  );
  if (!options?.end) return startLabel;
  const endLabel = new Date(options.end).toLocaleString(
    options.locale,
    dateTimeOptions,
  );
  return `${startLabel} – ${endLabel}`;
};
