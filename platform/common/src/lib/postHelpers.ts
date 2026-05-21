import {
  Answer,
  AnswerWithPublicProfile,
  AuthorizationData,
  CapabilitiesConfig,
  EntryWithPublicProfile,
  GroupWithMeta,
  PostType,
  PublicPost,
  Question,
  Thread,
  VisibilityType,
  visibilityTypeValues,
} from '../types';
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
  visibility === 'group' ?
    !!group && checkGroupCapabilities(authData, [`core-posts-create-${type}`], group).success :
    checkRoleCapabilities(authData.profile?.roles, [`core-posts-create-${type}-${visibility}`]).success
    && scopeMatches({ scopes: authData.scopes, requiredScope: { scopeLevel: 'write', resource: { type: 'posts' } } });

export const canCreatePostTypeInAnyGroup = (
  authData: AuthorizationData,
  type: PostType,
) =>
  scopeMatches({ scopes: authData.scopes, requiredScope: { scopeLevel: 'write', resource: { type: 'groups' } } }) &&
  !!authData.profile?.memberships?.some((m) =>
    checkGroupCapabilities(authData, [`core-posts-create-${type}`], m.group as GroupWithMeta).success,
  );

export const canCreatePostTypeWithVisibility = (
  authData: AuthorizationData,
  type: PostType,
  visibility: VisibilityType,
) =>
  visibility === 'group' ?
    canCreatePostTypeInAnyGroup(authData, type) :
    checkRoleCapabilities(authData.profile?.roles, [`core-posts-create-${type}-${visibility}`]).success &&
    scopeMatches({ scopes: authData.scopes, requiredScope: { scopeLevel: 'write', resource: { type: 'posts' } } });

export const canCreatePostType = (
  authData: AuthorizationData,
  type: PostType,
) =>
  visibilityTypeValues.some((visibility) => canCreatePostTypeWithVisibility(authData, type, visibility));


