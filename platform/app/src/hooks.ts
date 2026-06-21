import type { Reroute } from '@sveltejs/kit';

/** Route legacy /api/allpeep URLs to the /api/openpeeps handlers. */
export const reroute: Reroute = ({ url }) => {
  if (url.pathname.startsWith('/api/allpeep')) {
    return url.pathname.replace(/^\/api\/allpeep/, '/api/openpeeps');
  }
};
