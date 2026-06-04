import { Endpoint, z } from 'sveltekit-api';
import { publicPostSchema } from '@openpeeps/common/types';
import type { RequestEvent } from '@sveltejs/kit';
import { listLocalFeed } from '@openpeeps/core/posts';
import { ensureAccess } from '$lib/server/auth';

export const Output = publicPostSchema.array();
export const Query = z.object({
  start: z.string().optional(),
  limit: z.coerce.number().optional(),
});

export default new Endpoint({ Output, Query }).handle(
  async (params, event: RequestEvent) => {
    await ensureAccess(event);
    try {
      const posts = await listLocalFeed(event.locals.authData, Query.parse(params));
      // #region agent log
      fetch('http://127.0.0.1:7499/ingest/27c2d08d-4470-4015-abd2-33d1e0e3ecd8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a0a46a' },
        body: JSON.stringify({
          sessionId: 'a0a46a',
          runId: 'post-fix',
          hypothesisId: 'B-F',
          location: 'posts/feeds/local/GET.ts',
          message: 'local feed success',
          data: {
            hasProfile: !!event.locals.authData.profile,
            resultCount: posts.length,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      return posts;
    } catch (e) {
      // #region agent log
      fetch('http://127.0.0.1:7499/ingest/27c2d08d-4470-4015-abd2-33d1e0e3ecd8', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'a0a46a' },
        body: JSON.stringify({
          sessionId: 'a0a46a',
          runId: 'post-fix',
          hypothesisId: 'F',
          location: 'posts/feeds/local/GET.ts',
          message: 'local feed error',
          data: {
            error: e instanceof Error ? e.message : String(e),
            hasProfile: !!event.locals.authData.profile,
          },
          timestamp: Date.now(),
        }),
      }).catch(() => {});
      // #endregion
      throw e;
    }
  },
);
