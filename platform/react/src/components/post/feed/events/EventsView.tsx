import type { ReactNode } from 'react';
import { useEventView } from '../../../../stores/eventView';
import { EventViewSwitch } from '../../EventViewSwitch';
import { EventsCalendar } from './EventsCalendar';
import type { CalendarScopeProps } from './eventCalendar';

export interface EventsViewProps {
  /** Scope for calendar — lists don't use this. */
  calendar?: CalendarScopeProps;
  list: ReactNode;
}

/** List (the existing layout) or a month calendar, shared across event pages. */
export const EventsView = ({ calendar, list }: EventsViewProps) => {
  const { view } = useEventView();
  return (
    <div>
      <EventViewSwitch />
      {view === 'calendar' ? <EventsCalendar {...(calendar ?? {})} /> : list}
    </div>
  );
};
