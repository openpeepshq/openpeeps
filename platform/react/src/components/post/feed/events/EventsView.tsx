import type { ReactNode } from 'react';
import { useEventView } from '../../../../stores/eventView';
import { EventViewSwitch } from '../../EventViewSwitch';
import { EventsCalendar } from './EventsCalendar';
import type { EventsFeedQuery } from './EventsFeed';
import type { EventsAgendaWindow } from './eventCalendar';

export interface EventsViewProps {
  query: EventsFeedQuery;
  agenda: EventsAgendaWindow;
  list: ReactNode;
}

/** List (the existing layout) or a month calendar, shared across event pages. */
export const EventsView = ({ query, agenda, list }: EventsViewProps) => {
  const { view } = useEventView();
  return (
    <div>
      <EventViewSwitch />
      {view === 'calendar' ? (
        <EventsCalendar key={agenda} query={query} agenda={agenda} />
      ) : (
        list
      )}
    </div>
  );
};
