import { endpoint } from '#lib/endpoint';
import { z } from 'zod';
import { findPosts } from '@openpeepshq/core/posts';
import { buildEventsFeedIcs, EVENTS_ICS_FEED_TTL_SECONDS } from '@openpeepshq/common/lib';
import { config } from '@openpeepshq/core/config';
import { findProfileByCalendarFeedToken } from '@openpeepshq/core/calendarFeedTokens';
import { ensureLocalProfile } from '#lib/auth';

export const Input = z.object({
  token: z.string().optional(),
});

export const apiEndpoint = endpoint({ Input }).handle(
  async ({ token }, { event }) => {
    const { server: { publicContent } } = await config();

    let profile: { id: string } | null = null;

    if (token) {
      // Token-authenticated access: find profile by token
      const profileId = await findProfileByCalendarFeedToken(token);
      if (!profileId) {
        return { status: 401, body: 'Invalid token' };
      }
      profile = { id: profileId };
    } else if (event.context.currentProfile) {
      // Session-authenticated access
      profile = event.context.currentProfile;
    }

    // Find community from context if available
    const communityId = event.context.currentCommunityId;

    // Query public posts (all event posts visible to the user)
    const posts = await findPosts({
      type: 'event',
      visibility: 'public',
      ...(communityId ? { communityId } : {}),
      ...(profile ? { profileId: profile.id } : {}),
    });

    // Filter to only event-type posts
    const eventPosts = posts.filter(
      (p) => p.type === 'event' && p.data?.type === 'event',
    );

    const postUrlBase = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
    const ics = buildEventsFeedIcs(eventPosts, {
      postUrl: postUrlBase,
      name: 'OpenPeeps Events',
      ttl: EVENTS_ICS_FEED_TTL_SECONDS,
    });

    // Cache headers: public when publicContent is on, private otherwise
    // Token responses omit Vary since the token travels as a query param.
    // Token feed tokens grant no scopes (see calendarFeedTokens.ts).
    const responseHeaders: Record<string, string> = {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control': token || !publicContent ? 'private' : `public, max-age=${EVENTS_ICS_FEED_TTL_SECONDS}`,
    };

    // Add Vary only for session-based responses
    if (!token) {
      responseHeaders['Vary'] = 'Authorization, Cookie';
    }

    return {
      status: 200,
      headers: responseHeaders,
      body: ics,
    };
  },
);
