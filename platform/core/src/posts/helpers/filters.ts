import type { OMFilter } from '../../db/pg/map/queryTypes';
import {
  AuthorizationData,
  PostWithMeta,
  ProfileWithMeta,
  CapabilitiesConfig,
  postWithMetaSchema,
  DbBasePost,
} from '@openpeeps/common/types';
import { yesOrMaybeRsvpExpression } from './aql';
import { checkCapabilities, getPostCapabilities } from '@openpeeps/common/lib';
import { ObjectFilter } from '../../db/types';

export const ownPostsFilter = (
  profile: ProfileWithMeta,
): OMFilter<DbBasePost> => ({
  matches: {
    creatorId: profile.id,
  },
});

/** Widen the feed query to any group-tagged post; membership is enforced in `myFeedGroupMembershipFilter`. */
const groupPostVisibilityQueryFilter: OMFilter<DbBasePost> = {
  matches: { visibility: 'group' },
};

export const followFilter = (
  profile: ProfileWithMeta,
): OMFilter<DbBasePost> => ({
  matches: profile.following.map((f) => ({
    creatorId: f.id,
  })),
});

export const myFeedFilter = (
  profile: ProfileWithMeta,
): OMFilter<DbBasePost> => ({
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
): OMFilter<DbBasePost> => ({
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

export const upcomingEventsFilter = () => {
  const now = new Date().toISOString();
  return `((DOC.data.start > '${now}') || (DOC.data.end && DOC.data.end > '${now}'))`;
};

export const currentEventsFilter = () => {
  const now = new Date().toISOString();
  return `DOC.data.start <= '${now}' && (!DOC.data.end || DOC.data.end >= '${now}')`;
};

export const pastEventsFilter = () => {
  const now = new Date().toISOString();
  return `(DOC.data.end || DOC.data.start) < '${now}'`;
};

export const myEventsFilter = (
  profile: ProfileWithMeta,
): OMFilter<DbBasePost> => ({
  operator: '||',
  predicates: [
    {
      matches: {
        creatorId: profile.id,
      },
    },
    `"${profile.id}" IN DOC.data.jam.moderators || []`,
    yesOrMaybeRsvpExpression(profile),
  ],
});

export const jamFilter = 'DOC.data.jam != null';
