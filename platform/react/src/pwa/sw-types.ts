/**
 * Message types exchanged between the page and the OpenPeeps service worker.
 */
export type SWMessageFromPage =
  | { type: 'SKIP_WAITING' }
  | { type: 'INVALIDATE_QUERIES_PORT' }
  | { type: 'GET_PENDING_DEEPLINK' };

export type SWMessageToPage = { type: 'NAVIGATE_TO'; url: string };
