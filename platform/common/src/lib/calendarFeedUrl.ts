// The ICS feed endpoint lives at the application root, not under the API
// subtree — the same reason the HLS streaming URLs use the bare origin.
export const CALENDAR_FEED_PATH = '/api/openpeeps/core/v1/events/feed';

/**
 * Absolute subscription URL for a calendar feed token. The token travels as a
 * query param, so it must be the last (and only) component of the URL.
 * The token is percent-encoded even though it is currently plain lowercase
 * hex — the helper is a published export and the encoding keeps the contract
 * valid for any token shape (mirrors the server-side URL builders).
 */
export const buildCalendarFeedUrl = (origin: string, token: string): string =>
  `${origin.replace(/\/+$/, '')}${CALENDAR_FEED_PATH}?token=${encodeURIComponent(
    token,
  )}`;
