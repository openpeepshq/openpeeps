import { persistedStore, useStore } from './createStore';

export const EVENT_VIEW_OPTIONS = ['list', 'calendar'] as const;
export type EventView = (typeof EVENT_VIEW_OPTIONS)[number];

/** Survives reloads so the events layout stays put, like a view preference. */
export const eventViewStore = persistedStore<EventView>(
  'openpeeps.eventView',
  'list',
);

export const useEventView = () => {
  const stored = useStore(eventViewStore);
  const view: EventView = stored === 'calendar' ? 'calendar' : 'list';
  return {
    view,
    setView: (next: EventView) => {
      eventViewStore.set(next);
    },
  };
};
