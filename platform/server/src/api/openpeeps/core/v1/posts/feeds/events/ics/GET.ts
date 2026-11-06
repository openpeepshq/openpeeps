import { endpoint } from '#lib/endpoint';
import type { RequestEvent } from '@riddl/core';
import { buildEventsFeedIcs } from '@openpeepshq/common/lib';
import type { PublicPost } from '@openpeepshq/common/types';
import { listUpcomingEventsFeed } from '@openpeepshq/core/posts';
import { serverRootUrl } from '@openpeepshq/core/server';
import { ensureProfileOrPublicCommunity } from '#lib/auth';

/**
 * ICS (calendar) feed of the community's upcoming events, for subscription in
 * a calendar app. Guests see public events; signed-in profiles also see local
 * ones, matching the upcoming feed.
 */
export const apiEndpoint = endpoint({}).handle(
  async (_input, event: RequestEvent) => {
    await ensureProfileOrPublicCommunity(event);

    const posts = await listUpcomingEventsFeed(event.context.authData, {
      limit: 100,
    });
    const rootUrl = await serverRootUrl();

    const ics = buildEventsFeedIcs(posts as unknown as PublicPost[], {
      postUrl: (post) => `${rootUrl}/posts/${post.id}`,
    });

    return new Response(ics, {
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
      },
    });
  },
);
