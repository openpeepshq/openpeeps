import { endpoint, z } from '#lib/endpoint';
import { findProfileByCalendarFeedToken } from '@openpeepshq/core/calendarFeedTokens';
import {
  buildEventsFeedIcs,
  EVENTS_ICS_FEED_TTL_SECONDS,
} from '@openpeepshq/common/lib';
import { EVENT_RANGE_DEFAULT_LIMIT } from '@openpeepshq/common/types';
import { communityConfig, config } from '@openpeepshq/core/config';
import { listUpcomingEventsFeed } from '@openpeepshq/core/posts';
import type { AuthorizationData } from '@openpeepshq/common/types';
import type { RequestEvent } from '@riddl/core';
import { loadCurrentProfile } from '#lib/auth';

// The feed token travels as a query param, so it must be declared in `Query`
// — Riddl ignores `Input` for GETs and, more importantly, strips any query
// key not named in `Query` (zod `safeParse` drops unknown keys). Declaring it
// in `Input` only meant the credential was silently discarded and every
// request fell through to the guest path.
export const Query = z.object({ token: z.string().optional() });

// An empty calendar body, used for the unauthenticated-token 401 so the
// response still parses as a valid (empty) ICS feed.
const emptyCalendar = (): Response =>
  new Response(
    'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//OpenPeeps//Feed//EN\r\nEND:VCALENDAR\r\n',
    {
      status: 401,
      headers: {
        'Content-Type': 'text/calendar; charset=utf-8',
        'Cache-Control': 'private, no-store',
      },
    },
  );

export const apiEndpoint = endpoint({ Query }).handle(
  async ({ token }, event: RequestEvent) => {
    const { server } = await config();

    let authData: AuthorizationData;
    let personalized: boolean;

    if (token) {
      const profileId = await findProfileByCalendarFeedToken(token);
      if (!profileId) {
        return emptyCalendar();
      }
      // Resolve the token to the fully-loaded profile the session
      // authorization middleware injects (relations + `type`/`roles`), not a
      // bare `{ id }` stub — the visibility pipeline reads
      // `followers`/`following`/`memberships`/`type` off that shape, so a
      // stub both crashed it and lost the owner's local/group context.
      const profile = await loadCurrentProfile({
        identities: { profile: profileId },
        scopes: [],
      });
      // Token resolves but the owner no longer exists (deleted profile):
      // there is no live identity to attribute the feed to, so reject.
      if (!profile) {
        return emptyCalendar();
      }
      // Token auth ≠ session auth: the feed token only proves the profile for
      // visibility filtering; it grants no scopes.
      authData = { profile, scopes: [] };
      personalized = true;
    } else {
      // Session-authenticated or anonymous: the authorization middleware has
      // already populated event.context.authData with the real identity (or
      // the empty guest shape when unauthenticated).
      authData = event.context.authData;
      personalized = !!authData.profile;
    }

    // ICS has no pagination, so the feed must return the whole upcoming
    // horizon in one document. The bound is the shared upcoming-events
    // horizon — far above any realistic number of upcoming community
    // events, but finite so a pathological community can't produce an
    // unbounded ICS.
    const [posts, community] = await Promise.all([
      listUpcomingEventsFeed(authData, { limit: EVENT_RANGE_DEFAULT_LIMIT }),
      communityConfig(),
    ]);
    // The origin only — never the request URL, so `?token=` can't leak into
    // the ICS body as an event URL.
    const { origin } = new URL(event.request.url);
    const ics = buildEventsFeedIcs(posts, {
      postUrl: origin,
      name: community.info.name,
      ttl: EVENTS_ICS_FEED_TTL_SECONDS,
    });

    // Token responses are per-identity URLs and must never be shared-cached;
    // personalized session feeds neither. `public` stays reserved for truly
    // public communities so an edge cache cannot leak a private community's
    // events.
    const headers: Record<string, string> = {
      'Content-Type': 'text/calendar; charset=utf-8',
      'Cache-Control':
        personalized || !server.publicContent
          ? 'private, no-store'
          : `public, max-age=${EVENTS_ICS_FEED_TTL_SECONDS}`,
    };
    if (!personalized) {
      headers['Vary'] = 'Authorization, Cookie';
    }

    return new Response(ics, { status: 200, headers });
  },
);
