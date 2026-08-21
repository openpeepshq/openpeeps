import {
  Answer,
  AnswerWithPublicProfile,
  AuthorizationData,
  CapabilitiesConfig,
  EntryWithPublicProfile,
  Event,
  GroupWithMeta,
  PostType,
  PostDataUnion,
  PublicPost,
  PublicProfile,
  PublicRsvp,
  Question,
  Thread,
  VisibilityType,
  visibilityTypeValues,
} from '../types';
import { canModerateJam } from './jamHelpers';
import { sameRecurrenceId } from './eventRecurrence';
import {
  checkGroupCapabilities,
  checkPostCapabilities,
  checkRoleCapabilities,
} from './capabilitiesHelpers';
import { scopeMatches } from './scopeHelpers';
import { countBy, dateSorter, groupBy, transformValues } from './utils';

const buildThread = (rootPost: PublicPost, postList: PublicPost[]): Thread => ({
  ...rootPost,
  children: postList
    .filter((p) => p.inReplyToId === rootPost.id)
    .map((post) => buildThread(post, postList)),
});

export const buildThreads = (posts: PublicPost[]) =>
  posts
    .filter((p) => !posts.find((p2) => p2.id === p.inReplyToId))
    .map((post) => buildThread(post, posts))
    .sort(dateSorter());

export const getReactionCount = (post: PublicPost) => {
  return countBy(post.reactions, (r) => r.reaction);
};

export const countVotes = (optionsCount: number, answers: Answer[]) => {
  const voteCounts: number[] = new Array(optionsCount).fill(0);
  for (const answer of answers) {
    for (const index of answer.selection) {
      if (index < optionsCount) {
        voteCounts[index] = voteCounts[index] + 1;
      }
    }
  }
  return voteCounts;
};

/** Fill blank poll choices with their placeholder label (e.g. "Option 1"). */
export const resolvePollOptionContents = (
  options: readonly string[],
  fallbackLabel: (index: number) => string,
): string[] =>
  options.map((text, index) => {
    const trimmed = text.trim();
    return trimmed.length > 0 ? trimmed : fallbackLabel(index);
  });

export const collectVotes = (
  post: PublicPost,
): { voteCounts: number[]; votes: AnswerWithPublicProfile[] } => {
  if (post.type !== 'question') {
    return {
      voteCounts: [],
      votes: [],
    };
  }

  const postData = post.data as Question;

  const sortedVoteEntries = post.entries
    .filter((e) => e.type === 'answer')
    .sort(dateSorter<EntryWithPublicProfile>());

  const votesByProfile = groupBy<EntryWithPublicProfile, string>(
    sortedVoteEntries,
    (e) => e.profile.id,
  );

  const lastVoteByProfile = transformValues(
    votesByProfile,
    (votes) => votes.slice(-1)[0],
  );

  const votes: AnswerWithPublicProfile[] = [...Object.values(lastVoteByProfile)]
    .filter((ve) => (ve.data as Answer).selection.length > 0)
    .map((entry) => ({
      profile: entry.profile,
      selection: entry.data.selection,
    }));

  const voteCounts = countVotes(postData.options.length, votes);

  return {
    votes,
    voteCounts,
  };
};

const latestRsvpPerProfile = (rsvps: PublicRsvp[], recurrenceId?: string) => {
  const scoped = rsvps.filter((rsvp) => {
    if (recurrenceId) {
      if (rsvp.recurrenceId) {
        return sameRecurrenceId(rsvp.recurrenceId, recurrenceId);
      }
      return true;
    }
    return !rsvp.recurrenceId;
  });
  const rsvpsByProfile = groupBy(scoped, (r) => r.profile.id);
  return Object.values(rsvpsByProfile).map((profileRsvps) => {
    const instanceRsvps = recurrenceId
      ? profileRsvps.filter((rsvp) =>
          sameRecurrenceId(rsvp.recurrenceId, recurrenceId),
        )
      : [];
    const seriesRsvps = profileRsvps.filter((rsvp) => !rsvp.recurrenceId);
    const pool =
      recurrenceId && instanceRsvps.length > 0 ? instanceRsvps : seriesRsvps;
    const sorted = pool.sort(dateSorter<PublicRsvp>());
    return sorted[sorted.length - 1];
  });
};

export const calculateEffectiveRsvps = (
  post: PublicPost,
  recurrenceId?: string,
) =>
  latestRsvpPerProfile(post.rsvps || [], recurrenceId).filter(
    (rsvp): rsvp is PublicRsvp => !!rsvp,
  );

export const getEffectiveRsvp = (
  post: PublicPost,
  profileId: string,
  recurrenceId?: string,
) =>
  calculateEffectiveRsvps(post, recurrenceId).find(
    (r) => r.profile.id === profileId,
  );

export const countYesRsvps = (post: PublicPost, recurrenceId?: string) =>
  calculateEffectiveRsvps(post, recurrenceId).filter(
    (r) => r.response === 'yes',
  ).length;

export const isCapacityEvent = (event: Event) => !!event.maxAttendees;

export const parseEventMaxAttendeesInput = (
  raw: string,
): number | undefined => {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const parsed = Number.parseInt(trimmed, 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : undefined;
};

export const withoutEventMaxAttendees = <T extends Event>(event: T): T => {
  const { maxAttendees: _, ...rest } = event;
  return rest as T;
};

export const normalizeEventDataForSave = <T extends Event>(event: T): T => {
  const { maxAttendees } = event;
  if (
    maxAttendees == null ||
    !Number.isFinite(maxAttendees) ||
    maxAttendees < 1
  ) {
    return withoutEventMaxAttendees(event);
  }
  return { ...event, maxAttendees: Math.trunc(maxAttendees) };
};

/** ArangoDB may store null when capacity was cleared; strip for validation/output. */
export const normalizeEventDataFromDb = <T extends Event>(event: T): T => {
  if (event.maxAttendees != null) {
    return event;
  }
  return withoutEventMaxAttendees(event);
};

export const normalizePostDataFromDb = (data: PostDataUnion): PostDataUnion =>
  data.type === 'event' ? normalizeEventDataFromDb(data) : data;

/** ArangoDB update deep-merges nested `data`; null removes maxAttendees. */
export type EventDbUpdate = Omit<Event, 'maxAttendees'> & {
  maxAttendees?: number | null;
};

export const eventDataForDbUpdate = (
  previous: Event | undefined,
  normalized: Event,
): EventDbUpdate => {
  if (previous?.maxAttendees != null && !('maxAttendees' in normalized)) {
    return { ...normalized, maxAttendees: null };
  }
  return normalized;
};

export const canManageEventRsvps = (
  profile: Pick<PublicProfile, 'id'> | undefined,
  post: PublicPost,
) =>
  !!(
    profile &&
    (post.profile.id === profile.id || canModerateJam(profile, post))
  );

export type JamCapacityJoinBlock =
  | { blocked: false }
  | { blocked: true; reason: 'full' | 'rsvp-required' | 'removed' };

export const getJamCapacityJoinBlock = (
  post: PublicPost,
  profile: Pick<PublicProfile, 'id'> | undefined,
  recurrenceId?: string,
): JamCapacityJoinBlock => {
  const event = post.data?.type === 'event' ? post.data : undefined;
  if (!event?.maxAttendees || !profile?.id) {
    return { blocked: false };
  }

  if (canModerateJam(profile, post)) {
    return { blocked: false };
  }

  const myRsvp = getEffectiveRsvp(post, profile.id, recurrenceId);
  if (myRsvp?.response === 'yes') {
    return { blocked: false };
  }
  if (myRsvp?.response === 'removed') {
    return { blocked: true, reason: 'removed' };
  }
  if (countYesRsvps(post, recurrenceId) >= event.maxAttendees) {
    return { blocked: true, reason: 'full' };
  }
  return { blocked: true, reason: 'rsvp-required' };
};

export const canDeletePost = (
  authData: AuthorizationData,
  post: PublicPost,
  config: CapabilitiesConfig,
) =>
  checkPostCapabilities(authData, ['core-posts-delete'], post, config).success;

export const canCreatePost = (
  authData: AuthorizationData,
  type: PostType,
  visibility: VisibilityType,
  group?: GroupWithMeta,
) =>
  visibility === 'group'
    ? !!group &&
      checkGroupCapabilities(authData, [`core-posts-create-${type}`], group)
        .success
    : checkRoleCapabilities(authData.profile?.roles, [
        `core-posts-create-${type}-${visibility}`,
      ]).success &&
      scopeMatches({
        scopes: authData.scopes,
        requiredScope: { scopeLevel: 'write', resource: { type: 'posts' } },
      });

export const canCreatePostTypeInAnyGroup = (
  authData: AuthorizationData,
  type: PostType,
) =>
  scopeMatches({
    scopes: authData.scopes,
    requiredScope: { scopeLevel: 'write', resource: { type: 'groups' } },
  }) &&
  !!authData.profile?.memberships?.some(
    (m) =>
      checkGroupCapabilities(
        authData,
        [`core-posts-create-${type}`],
        m.group as GroupWithMeta,
      ).success,
  );

export const canCreatePostTypeWithVisibility = (
  authData: AuthorizationData,
  type: PostType,
  visibility: VisibilityType,
) =>
  visibility === 'group'
    ? canCreatePostTypeInAnyGroup(authData, type)
    : checkRoleCapabilities(authData.profile?.roles, [
        `core-posts-create-${type}-${visibility}`,
      ]).success &&
      scopeMatches({
        scopes: authData.scopes,
        requiredScope: { scopeLevel: 'write', resource: { type: 'posts' } },
      });

export const canCreatePostType = (
  authData: AuthorizationData,
  type: PostType,
) =>
  visibilityTypeValues.some((visibility) =>
    canCreatePostTypeWithVisibility(authData, type, visibility),
  );

export type PostActionAvailability = {
  canReply: boolean;
  canRepost: boolean;
  canReact: boolean;
};

/**
 * Whether Reply / Repost / Like should look live. Non-members of a group
 * post stay fully disabled (existing feed rule). Each action also follows
 * the capability the matching write endpoint actually checks: feed replies
 * and reposts need create-*, likes need core-posts-react.
 */
export const getPostActionAvailability = (
  authData: AuthorizationData,
  post: PublicPost,
  config: CapabilitiesConfig,
): PostActionAvailability => {
  const isGroupPost = !!post.groupId || !!post.group;
  const membershipExists = !!authData.profile?.memberships?.some(
    (m) => m.group.id === post.group?.id || m.group.id === post.groupId,
  );
  if (isGroupPost && !membershipExists) {
    return { canReply: false, canRepost: false, canReact: false };
  }

  const canReply =
    checkPostCapabilities(authData, ['core-posts-reply'], post, config)
      .success &&
    canCreatePost(authData, 'note', post.visibility, post.group ?? undefined);

  const canReact = checkPostCapabilities(
    authData,
    ['core-posts-react'],
    post,
    config,
  ).success;

  const canRepost = post.group
    ? checkGroupCapabilities(
        authData,
        [`core-posts-create-${post.type}`],
        post.group,
      ).success
    : canCreatePost(authData, post.type, post.visibility);

  return { canReply, canRepost, canReact };
};
