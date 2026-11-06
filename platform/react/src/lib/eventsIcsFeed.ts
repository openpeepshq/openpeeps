export const EVENTS_ICS_FEED_PATH =
  '/api/openpeeps/core/v1/posts/feeds/events/ics';

/** Public URL calendar apps subscribe to for the community event feed. */
export const eventsIcsFeedUrl = (origin: string) =>
  `${origin}${EVENTS_ICS_FEED_PATH}`;
