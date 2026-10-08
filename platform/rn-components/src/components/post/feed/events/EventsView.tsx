import React, { ReactNode } from 'react';
import { View } from 'react-native';
import {
  useEventView,
  type EventsAgendaWindow,
  type EventsCalendarQuery,
} from '@openpeepshq/react';
import { EventViewSwitch } from '../../EventViewSwitch';
import { EventsCalendar } from './EventsCalendar';

export interface EventsViewProps {
  query: EventsCalendarQuery;
  agenda: EventsAgendaWindow;
  list: ReactNode;
}

/** List (the existing layout) or a month calendar, shared across event pages. */
export const EventsView = ({ query, agenda, list }: EventsViewProps) => {
  const { view } = useEventView();
  return (
    <View className="flex-1">
      <EventViewSwitch />
      {view === 'calendar' ? (
        <EventsCalendar key={agenda} query={query} agenda={agenda} />
      ) : (
        list
      )}
    </View>
  );
};
