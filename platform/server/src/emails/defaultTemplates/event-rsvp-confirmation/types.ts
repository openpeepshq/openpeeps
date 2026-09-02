export interface EventRsvpConfirmationLocals {
  eventName: string;
  eventUrl: string;
  response: 'yes' | 'tentative';
  start: string;
  end?: string | null;
  location?: string | null;
  allDay?: boolean;
  timeZone?: string | null;
}
