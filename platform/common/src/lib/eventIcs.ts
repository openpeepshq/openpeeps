import ical, { ICalCalendarMethod } from 'ical-generator';
import type { Event, PublicPost } from '../types';

const utcDateFromYmd = (yyyyMmDd: string): Date => {
  const [y, m, d] = yyyyMmDd.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

const exclusiveEndAfterInclusiveDay = (yyyyMmDd: string): Date => {
  const dt = utcDateFromYmd(yyyyMmDd);
  dt.setUTCDate(dt.getUTCDate() + 1);
  return dt;
}

export const buildEventIcs = (
  post: PublicPost,
  options?: { postUrl?: string },
): string | null => {
  if (post.type !== 'event' || post.data?.type !== 'event') {
    return null;
  }

  const event = post.data as Event;
  const calendar = ical({
    prodId: '//OpenPeeps//Event//EN',
    method: ICalCalendarMethod.PUBLISH,
    scale: 'GREGORIAN',
  });

  const link = event.url ?? options?.postUrl;
  const summary = event.name?.trim() || 'Event';
  const description = event.content?.trim();
  const location = event.physicalLocation?.text?.trim();

  if (event.wholeDay) {
    const startYmd = event.start.slice(0, 10);
    const lastInclusiveYmd = event.end?.slice(0, 10) ?? startYmd;
    calendar.createEvent({
      id: `openpeeps-event-${post.id}@openpeeps`,
      allDay: true,
      start: utcDateFromYmd(startYmd),
      end: exclusiveEndAfterInclusiveDay(lastInclusiveYmd),
      summary,
      ...(description ? { description } : {}),
      ...(location ? { location } : {}),
      ...(link ? { url: link } : {}),
    });
  } else {
    const start = new Date(event.start);
    const end = event.end
      ? new Date(event.end)
      : new Date(start.getTime() + 60 * 60 * 1000);
    calendar.createEvent({
      id: `openpeeps-event-${post.id}@openpeeps`,
      start,
      end,
      summary,
      ...(description ? { description } : {}),
      ...(location ? { location } : {}),
      ...(link ? { url: link } : {}),
    });
  }

  return calendar.toString() + '\r\n';
}
