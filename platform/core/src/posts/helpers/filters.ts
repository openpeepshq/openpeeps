import type { PgFilter } from '../../db/pg/map/queryTypes';
import {
  AuthorizationData,
  PostWithMeta,
  ProfileWithMeta,
  CapabilitiesConfig,
  postWithMetaSchema,
  DbBasePost,
} from '@openpeepshq/common/types';
import { combine, eventTimeFilters, postFilters } from '../../db/pg/filters';
import {
  checkCapabilities,
  getPostCapabilities,
} from '@openpeepshq/common/lib';

export const myFeedFilter = (profile: ProfileWithMeta): PgFilter<DbBasePost> =>
  postFilters.myFeed(
    profile.id,
    profile.following.map(({ id }) => id),
    profile.memberships.map(({ group }) => group.id),
  );

export const localFeedFilter = (): PgFilter<DbBasePost> => ({
  matches: [{ visibility: 'local' }, { visibility: 'public' }],
});

export const canReadPost =
  (config: CapabilitiesConfig, authData: AuthorizationData) =>
  (post?: PostWithMeta) =>
    !!post &&
    checkCapabilities(
      ['core-posts-read'],
      getPostCapabilities(authData, post, config),
    ).success &&
    postWithMetaSchema.safeParse(post).success;

export const upcomingEventsFilter = () => eventTimeFilters.upcoming();

export const currentEventsFilter = () => eventTimeFilters.current();

export const pastEventsFilter = () => eventTimeFilters.past();

export const myEventsFilter = (
  profile: ProfileWithMeta,
): PgFilter<DbBasePost> =>
  combine.or(
    postFilters.creatorId(profile.id),
    postFilters.isJamModerator(profile.id),
    postFilters.hasYesOrMaybeRsvp(profile.id),
  );

export const jamFilter = postFilters.hasJam();
