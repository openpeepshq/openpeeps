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
import { checkCapabilities, getPostCapabilities } from '@openpeepshq/common/lib';
import { ObjectFilter } from '../../db/types';

export const ownPostsFilter = (
  profile: ProfileWithMeta,
): PgFilter<DbBasePost> => ({
  matches: {
    creatorId: profile.id,
  },
});

/** Widen the feed query to any group-tagged post; membership is enforced in `myFeedGroupMembershipFilter`. */
const groupPostVisibilityQueryFilter: PgFilter<DbBasePost> = {
  matches: { visibility: 'group' },
};

export const followFilter = (
  profile: ProfileWithMeta,
): PgFilter<DbBasePost> => ({
  matches: profile.following.map((f) => ({
    creatorId: f.id,
  })),
});

export const myFeedFilter = (
  profile: ProfileWithMeta,
): PgFilter<DbBasePost> => ({
  operator: '||',
  predicates: [
    ownPostsFilter(profile),
    groupPostVisibilityQueryFilter,
    followFilter(profile),
  ],
});

export const myFeedGroupMembershipFilter =
  (profile: ProfileWithMeta): ObjectFilter<PostWithMeta> =>
  (post) =>
    post.visibility !== 'group' ||
    (!!post.group &&
      profile.memberships.some((m) => m.group.id === post.group?.id));

export const localFeedFilter = (
  _profile?: ProfileWithMeta,
): PgFilter<DbBasePost> => ({
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
