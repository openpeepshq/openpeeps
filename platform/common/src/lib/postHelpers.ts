import {
  Answer,
  AnswerWithPublicProfile,
  CapabilitiesConfig,
  EntryWithPublicProfile,
  GroupWithMeta,
  Jam,
  PostType,
  ProfileWithMeta,
  PublicPost,
  Question,
  Thread,
  VisibilityType,
  visibilityTypeValues,
} from '../types';
import { checkGroupCapabilities, checkPostCapabilities, checkRoleCapabilities } from './capabilitiesHelpers';
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

export const getJamUrl = (id: string, origin: string | undefined) => {
  if (!id) {
    return '';
  }
  if (!origin) return `/events/${id}/jam`;
  return `${origin}/events/${id}/jam`;
};

export const jamFromEvent = (event: PublicPost): Jam | undefined => {
  if (event.data?.type === 'event' && event.data?.jam) {
    return event.data.jam;
  }
  return undefined;
};

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

export const calculateEffectiveRsvps = (post: PublicPost) => {
  const rsvps = post.rsvps || [];
  const rsvpsByProfile = groupBy(rsvps, (r) => r.profile.id);
  const effectiveRsvps = Object.values(rsvpsByProfile).map((r) => r[0]);
  return effectiveRsvps;
};

export const canDeletePost = (
  profile: ProfileWithMeta,
  post: PublicPost,
  config: CapabilitiesConfig,
) =>
  checkPostCapabilities(['core-posts-delete'], profile, post, config).success;


export const canCreatePost = (
  profile: ProfileWithMeta,
  type: PostType,
  visibility: VisibilityType,
  group?: GroupWithMeta,
) =>
  visibility === 'group' ?
    group && checkGroupCapabilities([`core-posts-create-${type}`], profile, group).success :
    checkRoleCapabilities([`core-posts-create-${type}-${visibility}`], profile.roles).success;

export const canCreatePostTypeInAnyGroup = (
  profile: ProfileWithMeta,
  type: PostType,
) =>
  profile?.memberships?.some((m) => {
    return checkGroupCapabilities([`core-posts-create-${type}`], profile, m.group).success;
  })

export const canCreatePostTypeWithVisibility = (
  profile: ProfileWithMeta,
  type: PostType,
  visibility: VisibilityType,
) =>
  visibility === 'group' ?
    canCreatePostTypeInAnyGroup(profile, type) :
    checkRoleCapabilities([`core-posts-create-${type}-${visibility}`], profile.roles).success;

export const canCreatePostType = (
  profile: ProfileWithMeta,
  type: PostType,
) =>
  visibilityTypeValues.some((visibility) => canCreatePostTypeWithVisibility(profile, type, visibility));