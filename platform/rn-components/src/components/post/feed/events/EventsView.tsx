import React, { ReactNode } from 'react';
import { View } from 'react-native';
import { useEventView, type CalendarScopeProps } from '@openpeepshq/react';
import { EventViewSwitch } from '../../EventViewSwitch';
import { EventsCalendar } from './EventsCalendar';

export interface EventsViewProps {
  /** Scope for calendar — lists don't use this. */
  calendar?: CalendarScopeProps;
  list: ReactNode;
}

/** List (the existing layout) or a month calendar, shared across event pages. */
export const EventsView = ({ calendar, list }: EventsViewProps) => {
  const { view } = useEventView();
  return (
    <View className="flex-1">
      <EventViewSwitch />
      {view === 'calendar' ? <EventsCalendar {...(calendar ?? {})} /> : list}
    </View>
  );
};
