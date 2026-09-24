import { describe, it, expect } from 'vitest';
import {
  buildThreads,
  buildThreadPreview,
  getReactionCount,
  countVotes,
  collectVotes,
  resolvePollOptionContents,
  pollOptionsWithinLimit,
  calculateEffectiveRsvps,
  countYesRsvps,
  displayRsvpForProfile,
  getEffectiveRsvp,
  listRsvpCancellations,
  listedRsvps,
  rsvpCancelNotice,
  rsvpCancelWhenLabels,
  instanceRsvpIdsForProfile,
  isCapacityEvent,
  recurringEventHasOpenOccurrence,
  overlaySeriesRsvpEntries,
  seriesYesBlockedByCapacity,
  normalizeEventDataForSave,
  normalizeEventDataFromDb,
  normalizePostDataFromDb,
  eventDataForDbUpdate,
  getJamCapacityJoinBlock,
  canDeletePost,
  getPostActionAvailability,
  toHiddenPost,
  isHiddenPost,
  isOneToOneWithBlocked,
  HIDDEN_AUTHOR_HANDLE,
} from '../postHelpers';
import { groupCapabilityTemplates } from '../groupHelpers';
import {
  getJamUrl,
  jamFromEvent,
  jamRoomName,
  postIdFromJamRoomName,
  uniquePostsById,
} from '../jamHelpers';
import type {
  Event,
  PublicPost,
  PublicProfile,
  Jam,
  Question,
  Answer,
  ProfileWithMeta,
  CapabilitiesConfig,
  EntryWithPublicProfile,
  PublicRsvp,
  GroupWithMeta,
} from '../../types';

// Mock data for testing
const mockProfile: ProfileWithMeta = {
  id: 'profile1',
  displayName: 'Test User',
  roles: [],
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  type: 'local',
  handle: 'test-user',
  followers: [],
  following: [],
  controllers: [],
  memberships: [],
  profileStats: {
    posts: 0,
    comments: 0,
    reactions: 0,
    followersCount: 0,
    followingCount: 0,
  },
} as ProfileWithMeta;

const mockPublicProfile = {
  id: 'profile1',
  displayName: 'Test User',
} as PublicProfile;

const mockPost: PublicPost = {
  id: 'post1',
  type: 'note',
  createdAt: '2023-01-01T00:00:00Z',
  updatedAt: '2023-01-01T00:00:00Z',
  data: {
    type: 'note',
  },
  visibility: 'public',
  repostCount: 0,
  replyCount: 0,
  tags: [],
  inReplyToId: null,
  reactions: [
    { reaction: '👍', profile: mockPublicProfile },
    { reaction: '💜', profile: mockPublicProfile },
    { reaction: '👍', profile: mockPublicProfile },
  ],
  reposts: [],
  entries: [],
  rsvps: [],
  group: null,
  profile: mockPublicProfile,
  mentions: [],
} as PublicPost;

const mockEventPost: PublicPost = {
  id: 'event1',
  type: 'event',
  createdAt: '2023-01-01T00:00:00Z',
  inReplyToId: null,
  reactions: [],
  reposts: [],
  entries: [],
  rsvps: [],
  group: null,
  profile: mockPublicProfile,
  mentions: [],
  data: {
    type: 'event',
    jam: {
      id: 'jam1',
      name: 'Test Jam',
      type: 'video-call',
      moderators: [],
      videoEnabled: true,
      speakers: [],
      presenters: [],
      audience: [],
      waitingRoom: false,
    },
    start: '2023-01-01T00:00:00Z',
    wholeDay: false,
  },
  updatedAt: '2023-01-01T00:00:00Z',
  visibility: 'public',
  repostCount: 0,
  replyCount: 0,
  tags: [],
} as PublicPost;

const mockQuestionPost: PublicPost = {
  id: 'question1',
  type: 'question',
  createdAt: '2023-01-01T00:00:00Z',
  inReplyToId: null,
  reactions: [],
  reposts: [],
  entries: [
    {
      type: 'answer',
      profile: mockPublicProfile,
      data: {
        selection: [0, 1],
      } as Answer,
      createdAt: '2023-01-01T00:00:00Z',
    },
    {
      type: 'answer',
      profile: { ...mockPublicProfile, id: 'profile2' },
      data: {
        selection: [1],
      } as Answer,
      createdAt: '2023-01-01T00:00:00Z',
    },
  ],
  rsvps: [],
  group: null,
  profile: mockPublicProfile,
  mentions: [],
  data: {
    type: 'question',
    options: [
      { type: 'note', content: 'Option 1' },
      { type: 'note', content: 'Option 2' },
      { type: 'note', content: 'Option 3' },
    ],
    expiresAt: '2023-01-01T00:00:00Z',
  } as Question,
  updatedAt: '2023-01-01T00:00:00Z',
  visibility: 'public',
  repostCount: 0,
  replyCount: 0,
  tags: [],
} as PublicPost;

const mockCapabilitiesConfig: CapabilitiesConfig = {
  post: {
    local: { add: ['core-posts-delete'], remove: [] },
    none: { add: ['core-posts-delete'], remove: [] },
    self: { add: ['core-posts-delete'], remove: [] },
    mentioned: { add: [], remove: [] },
    attendee: { add: [], remove: [] },
  },
  profile: {
    local: { add: [], remove: [] },
    none: { add: [], remove: [] },
    self: { add: [], remove: [] },
    followedBy: { add: [], remove: [] },
    following: { add: [], remove: [] },
  },
  report: {
    local: { add: [], remove: [] },
    none: { add: [], remove: [] },
    reporter: { add: [], remove: [] },
    reported: { add: [], remove: [] },
  },
  accessToken: {
    none: { add: [], remove: [] },
    local: { add: [], remove: [] },
    owner: { add: [], remove: [] },
  },
};

describe('postHelpers', () => {
  describe('buildThreads', () => {
    it('should build threads from posts', () => {
      const posts: PublicPost[] = [
        { ...mockPost, id: 'root1', inReplyToId: null },
        { ...mockPost, id: 'reply1', inReplyToId: 'root1' },
        { ...mockPost, id: 'reply2', inReplyToId: 'root1' },
        { ...mockPost, id: 'root2', inReplyToId: null },
      ];
      const result = buildThreads(posts);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('root1');
      expect(result[0].children).toHaveLength(2);
    });

    it('should handle empty posts array', () => {
      const result = buildThreads([]);
      expect(result).toEqual([]);
    });

    it('should sort threads by date', () => {
      const posts: PublicPost[] = [
        {
          ...mockPost,
          id: 'root2',
          createdAt: '2023-01-02T00:00:00Z',
          inReplyToId: null,
        },
        {
          ...mockPost,
          id: 'root1',
          createdAt: '2023-01-01T00:00:00Z',
          inReplyToId: null,
        },
      ];
      const result = buildThreads(posts);
      expect(result[0].id).toBe('root1');
      expect(result[1].id).toBe('root2');
    });
  });

  describe('buildThreadPreview', () => {
    it('keeps sibling direct replies as separate leaves', () => {
      const groups = buildThreadPreview('root', [
        { id: 'c', createdAt: '2024-01-03T00:00:00Z', inReplyToId: 'root' },
        { id: 'a', createdAt: '2024-01-01T00:00:00Z', inReplyToId: 'root' },
        { id: 'b', createdAt: '2024-01-02T00:00:00Z', inReplyToId: 'root' },
      ]);
      expect(groups).toHaveLength(3);
      expect(groups.map((group) => group.posts.map((post) => post.id))).toEqual(
        [['a'], ['b'], ['c']],
      );
      expect(groups.every((group) => !group.ancestor)).toBe(true);
    });

    it('collapses a single reply chain', () => {
      const groups = buildThreadPreview('root', [
        { id: 'c', createdAt: '2024-01-03T00:00:00Z', inReplyToId: 'b' },
        { id: 'a', createdAt: '2024-01-01T00:00:00Z', inReplyToId: 'root' },
        { id: 'b', createdAt: '2024-01-02T00:00:00Z', inReplyToId: 'a' },
      ]);
      expect(groups).toHaveLength(1);
      expect(groups[0]?.posts.map((post) => post.id)).toEqual(['a', 'b', 'c']);
      expect(groups[0]?.ancestor).toBeUndefined();
      expect(groups[0]?.skippedAncestor).toBe(false);
    });

    it('shows a skipped ancestor when the chain starts below a nested parent', () => {
      const ancestor = {
        id: 'pat',
        createdAt: '2024-01-01T00:00:00Z',
        inReplyToId: 'nested',
      };
      const groups = buildThreadPreview('root', [
        {
          id: 'c',
          createdAt: '2024-01-02T00:00:00Z',
          inReplyToId: 'pat',
          replyTo: ancestor,
        },
        {
          id: 'd',
          createdAt: '2024-01-03T00:00:00Z',
          inReplyToId: 'c',
        },
        {
          id: 'e',
          createdAt: '2024-01-04T00:00:00Z',
          inReplyToId: 'd',
        },
      ]);
      expect(groups).toHaveLength(1);
      expect(groups[0]?.ancestor?.id).toBe('pat');
      expect(groups[0]?.skippedAncestor).toBe(true);
      expect(groups[0]?.posts.map((post) => post.id)).toEqual(['c', 'd', 'e']);
    });

    it('splits a sibling leaf from a nested chain', () => {
      const ancestor = {
        id: 'sam',
        createdAt: '2024-01-02T00:00:00Z',
        inReplyToId: 'nested',
      };
      const groups = buildThreadPreview('root', [
        { id: 'alex', createdAt: '2024-01-01T00:00:00Z', inReplyToId: 'root' },
        {
          id: 'riley',
          createdAt: '2024-01-03T00:00:00Z',
          inReplyToId: 'sam',
          replyTo: ancestor,
        },
        {
          id: 'jordan',
          createdAt: '2024-01-04T00:00:00Z',
          inReplyToId: 'riley',
        },
      ]);
      expect(groups).toHaveLength(2);
      expect(groups[0]?.posts.map((post) => post.id)).toEqual(['alex']);
      expect(groups[1]?.ancestor?.id).toBe('sam');
      expect(groups[1]?.skippedAncestor).toBe(true);
      expect(groups[1]?.posts.map((post) => post.id)).toEqual([
        'riley',
        'jordan',
      ]);
    });
  });

  describe('getJamUrl', () => {
    it('should return jam URL with origin', () => {
      const result = getJamUrl('jam1', 'https://example.com');
      expect(result).toBe('https://example.com/events/jam1/jam');
    });

    it('should return jam URL without origin', () => {
      const result = getJamUrl('jam1', undefined);
      expect(result).toBe('/events/jam1/jam');
    });

    it('appends occurrence query when provided', () => {
      const result = getJamUrl(
        'jam1',
        'https://example.com',
        '2026-09-08T16:00:00.000Z',
      );
      expect(result).toBe(
        'https://example.com/events/jam1/jam?occurrence=2026-09-08T16%3A00%3A00.000Z',
      );
    });

    it('should return empty string for empty id', () => {
      const result = getJamUrl('', 'https://example.com');
      expect(result).toBe('');
    });
  });

  describe('jamRoomName', () => {
    it('uses the event id for every occurrence', () => {
      expect(jamRoomName('abc', '2026-09-08T16:00:00.000Z')).toBe('abc');
      expect(jamRoomName('abc')).toBe('abc');
    });

    it('extracts the post id from a leftover occurrence room name', () => {
      const postId = '11111111-1111-1111-1111-111111111111';
      expect(postIdFromJamRoomName(`${postId}_2026-09-08T16-00-00-000Z`)).toBe(
        postId,
      );
    });
  });

  describe('uniquePostsById', () => {
    it('keeps one post when two occurrence rooms map to the same jam', () => {
      const standup = { id: 'standup' };
      const other = { id: 'other' };
      expect(uniquePostsById([standup, standup, undefined, other])).toEqual([
        standup,
        other,
      ]);
    });
  });

  describe('jamFromEvent', () => {
    it('should return jam from event post', () => {
      const result = jamFromEvent(mockEventPost);
      expect(result).toEqual({
        id: 'jam1',
        name: 'Test Jam',
        type: 'video-call',
        moderators: [],
        videoEnabled: true,
        speakers: [],
        presenters: [],
        audience: [],
        waitingRoom: false,
      });
    });

    it('should return undefined for non-event post', () => {
      const result = jamFromEvent(mockPost);
      expect(result).toBeUndefined();
    });

    it('should return undefined for event without jam', () => {
      const eventWithoutJam = {
        ...mockEventPost,
        data: { ...mockEventPost.data, jam: undefined },
      };
      const result = jamFromEvent(eventWithoutJam);
      expect(result).toBeUndefined();
    });
  });

  describe('getReactionCount', () => {
    it('should count reactions by type', () => {
      const result = getReactionCount(mockPost);
      expect(result).toEqual({
        '👍': 2,
        '💜': 1,
      });
    });

    it('should handle empty reactions', () => {
      const postWithoutReactions = { ...mockPost, reactions: [] };
      const result = getReactionCount(postWithoutReactions);
      expect(result).toEqual({});
    });
  });

  describe('countVotes', () => {
    it('should count votes for options', () => {
      const answers: Answer[] = [
        { selection: [0, 1] },
        { selection: [1] },
        { selection: [0, 2] },
      ];
      const result = countVotes(3, answers);
      expect(result).toEqual([2, 2, 1]);
    });

    it('should handle empty answers', () => {
      const result = countVotes(3, []);
      expect(result).toEqual([0, 0, 0]);
    });

    it('should ignore invalid indices', () => {
      const answers: Answer[] = [
        { selection: [0, 5] }, // 5 is out of bounds
        { selection: [1] },
      ];
      const result = countVotes(3, answers);
      expect(result).toEqual([1, 1, 0]);
    });
  });

  describe('resolvePollOptionContents', () => {
    const fallback = (index: number) => `Option ${index + 1}`;

    it('uses placeholder labels for blank choices', () => {
      expect(resolvePollOptionContents(['', '  '], fallback)).toEqual([
        'Option 1',
        'Option 2',
      ]);
    });

    it('keeps typed labels and trims them', () => {
      expect(resolvePollOptionContents([' Yes ', '', 'No'], fallback)).toEqual([
        'Yes',
        'Option 2',
        'No',
      ]);
    });
  });

  describe('pollOptionsWithinLimit', () => {
    it('accepts choices at the schema cap', () => {
      expect(pollOptionsWithinLimit(['Yes', 'a'.repeat(30)])).toBe(true);
    });

    it('rejects choices over the schema cap', () => {
      expect(pollOptionsWithinLimit(['Yes', 'a'.repeat(31)])).toBe(false);
    });
  });

  describe('collectVotes', () => {
    it('should collect votes from question post', () => {
      const result = collectVotes(mockQuestionPost);
      expect(result.votes).toHaveLength(2);
      expect(result.voteCounts).toEqual([1, 2, 0]);
    });

    it('should return empty for non-question post', () => {
      const result = collectVotes(mockPost);
      expect(result.votes).toEqual([]);
      expect(result.voteCounts).toEqual([]);
    });

    it('should filter out empty selections', () => {
      const postWithEmptyAnswer = {
        ...mockQuestionPost,
        entries: [
          {
            type: 'answer',
            profile: mockPublicProfile,
            data: { selection: [] },
            createdAt: '2023-01-01T00:00:00Z',
          } as EntryWithPublicProfile,
        ],
      };
      const result = collectVotes(postWithEmptyAnswer);
      expect(result.votes).toEqual([]);
    });
  });

  describe('calculateEffectiveRsvps', () => {
    it('should return effective RSVPs', () => {
      const postWithRsvps = {
        ...mockPost,
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes',
            createdAt: '2023-01-01T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'profile2' },
            response: 'no',
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      const result = calculateEffectiveRsvps(postWithRsvps);
      expect(result).toHaveLength(2);
    });

    it('should handle empty RSVPs', () => {
      const result = calculateEffectiveRsvps(mockPost);
      expect(result).toEqual([]);
    });

    it('should deduplicate RSVPs by profile keeping latest response', () => {
      const postWithDuplicateRsvps = {
        ...mockPost,
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes',
            createdAt: '2023-01-01T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'no',
            createdAt: '2023-01-02T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'profile2' },
            response: 'tentative',
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      const result = calculateEffectiveRsvps(postWithDuplicateRsvps);
      expect(result).toHaveLength(2);
      expect(result.find((r) => r.profile.id === 'profile1')?.response).toBe(
        'no',
      );
    });

    it('should count yes RSVPs', () => {
      const postWithRsvps = {
        ...mockPost,
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes',
            createdAt: '2023-01-01T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'profile2' },
            response: 'no',
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(countYesRsvps(postWithRsvps)).toBe(1);
    });

    it('does not let one occurrence fill capacity for another', () => {
      const occurrenceA = '2026-09-08T16:00:00.000Z';
      const occurrenceB = '2026-09-15T16:00:00.000Z';
      const postWithRsvps = {
        ...mockPost,
        data: {
          type: 'event' as const,
          start: occurrenceA,
          wholeDay: false,
          maxAttendees: 1,
        },
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes' as const,
            recurrenceId: occurrenceA,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(countYesRsvps(postWithRsvps, occurrenceA)).toBe(1);
      expect(countYesRsvps(postWithRsvps, occurrenceB)).toBe(0);
    });

    it('collects distinct instance RSVP ids for a profile', () => {
      const occurrenceA = '2026-09-08T16:00:00.000Z';
      const occurrenceB = '2026-09-15T16:00:00.000Z';
      const postWithRsvps = {
        ...mockPost,
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'no' as const,
            recurrenceId: occurrenceA,
            createdAt: '2023-01-01T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes' as const,
            recurrenceId: occurrenceA,
            createdAt: '2023-01-02T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'no' as const,
            recurrenceId: occurrenceB,
            createdAt: '2023-01-01T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes' as const,
            createdAt: '2023-01-03T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'profile2' },
            response: 'yes' as const,
            recurrenceId: occurrenceA,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(instanceRsvpIdsForProfile(postWithRsvps, 'profile1')).toEqual([
        occurrenceA,
        occurrenceB,
      ]);
    });

    it('overlays instance rows when writing a series RSVP', () => {
      expect(
        overlaySeriesRsvpEntries('yes', [
          '2026-09-08T16:00:00.000Z',
          '2026-09-15T16:00:00.000Z',
        ]),
      ).toEqual([
        { response: 'yes' },
        { response: 'yes', recurrenceId: '2026-09-08T16:00:00.000Z' },
        { response: 'yes', recurrenceId: '2026-09-15T16:00:00.000Z' },
      ]);
    });

    it('blocks series yes when an upcoming occurrence is full', () => {
      const occurrenceA = '2026-09-08T16:00:00.000Z';
      const occurrenceB = '2026-09-15T16:00:00.000Z';
      const postWithRsvps = {
        ...mockPost,
        type: 'event' as const,
        data: {
          type: 'event' as const,
          start: occurrenceA,
          wholeDay: false,
          maxAttendees: 1,
          recurrence: { freq: 'WEEKLY' as const, count: 3 },
        },
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile2' },
            response: 'yes' as const,
            recurrenceId: occurrenceB,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(
        seriesYesBlockedByCapacity(
          postWithRsvps,
          'profile1',
          new Date(occurrenceA),
        ),
      ).toBe(true);
    });

    it('keeps Register open when the next date is full but a later date is not', () => {
      const occurrenceA = '2026-09-08T16:00:00.000Z';
      const occurrenceB = '2026-09-15T16:00:00.000Z';
      const postWithRsvps = {
        ...mockPost,
        type: 'event' as const,
        data: {
          type: 'event' as const,
          start: occurrenceA,
          wholeDay: false,
          maxAttendees: 1,
          recurrence: { freq: 'WEEKLY' as const, count: 3 },
        },
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile2' },
            response: 'yes' as const,
            recurrenceId: occurrenceA,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(countYesRsvps(postWithRsvps, occurrenceA)).toBe(1);
      expect(countYesRsvps(postWithRsvps, occurrenceB)).toBe(0);
      expect(
        recurringEventHasOpenOccurrence(
          postWithRsvps,
          'profile1',
          new Date(occurrenceA),
        ),
      ).toBe(true);
    });

    it('treats the series as full only when no upcoming date has a seat', () => {
      const occurrenceA = '2026-09-08T16:00:00.000Z';
      const occurrenceB = '2026-09-15T16:00:00.000Z';
      const postWithRsvps = {
        ...mockPost,
        type: 'event' as const,
        data: {
          type: 'event' as const,
          start: occurrenceA,
          wholeDay: false,
          maxAttendees: 1,
          recurrence: { freq: 'WEEKLY' as const, count: 2 },
        },
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile2' },
            response: 'yes' as const,
            recurrenceId: occurrenceA,
            createdAt: '2023-01-01T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'other' },
            response: 'yes' as const,
            recurrenceId: occurrenceB,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(
        recurringEventHasOpenOccurrence(
          postWithRsvps,
          'profile1',
          new Date(occurrenceA),
        ),
      ).toBe(false);
    });

    it('surfaces an instance RSVP on the series page after a partial RSVP', () => {
      const occurrenceA = '2026-09-08T16:00:00.000Z';
      const occurrenceB = '2026-09-15T16:00:00.000Z';
      const postWithRsvps = {
        ...mockPost,
        type: 'event' as const,
        data: {
          type: 'event' as const,
          start: occurrenceA,
          wholeDay: false,
          recurrence: { freq: 'WEEKLY' as const, count: 3 },
        },
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes' as const,
            recurrenceId: occurrenceB,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(
        displayRsvpForProfile(postWithRsvps, 'profile1', {
          now: new Date(occurrenceA),
        })?.response,
      ).toBe('yes');
    });

    it('does not use another date when lockToOccurrence is set', () => {
      const occurrenceA = '2026-09-08T16:00:00.000Z';
      const occurrenceB = '2026-09-15T16:00:00.000Z';
      const postWithRsvps = {
        ...mockPost,
        type: 'event' as const,
        data: {
          type: 'event' as const,
          start: occurrenceA,
          wholeDay: false,
          recurrence: { freq: 'WEEKLY' as const, count: 3 },
        },
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes' as const,
            recurrenceId: occurrenceB,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(
        displayRsvpForProfile(postWithRsvps, 'profile1', {
          recurrenceId: occurrenceA,
          lockToOccurrence: true,
          now: new Date(occurrenceA),
        }),
      ).toBeUndefined();
    });

    it('allows series yes when the member already occupies the full date', () => {
      const occurrenceA = '2026-09-08T16:00:00.000Z';
      const postWithRsvps = {
        ...mockPost,
        type: 'event' as const,
        data: {
          type: 'event' as const,
          start: occurrenceA,
          wholeDay: false,
          maxAttendees: 1,
          recurrence: { freq: 'WEEKLY' as const, count: 2 },
        },
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes' as const,
            recurrenceId: occurrenceA,
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(
        seriesYesBlockedByCapacity(
          postWithRsvps,
          'profile1',
          new Date(occurrenceA),
        ),
      ).toBe(false);
    });

    it('should get effective RSVP for a profile', () => {
      const postWithRsvps = {
        ...mockPost,
        rsvps: [
          {
            profile: { ...mockPublicProfile, id: 'profile1' },
            response: 'yes',
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      expect(getEffectiveRsvp(postWithRsvps, 'profile1')?.response).toBe('yes');
    });

    it('should detect capacity events', () => {
      expect(isCapacityEvent({ maxAttendees: 10 } as Event)).toBe(true);
      expect(isCapacityEvent({} as Event)).toBe(false);
    });

    it('should clear maxAttendees when normalizing empty capacity', () => {
      const base = {
        type: 'event',
        start: '2023-01-01T00:00:00.000Z',
        wholeDay: false,
      } as Event;

      expect(normalizeEventDataForSave({ ...base, maxAttendees: 10 })).toEqual({
        ...base,
        maxAttendees: 10,
      });
      expect(
        normalizeEventDataForSave({ ...base, maxAttendees: null }),
      ).toEqual(base);
      expect(
        normalizeEventDataForSave({ ...base, maxAttendees: undefined }),
      ).toEqual(base);
    });

    it('should use null maxAttendees when clearing capacity', () => {
      const base = {
        type: 'event',
        start: '2023-01-01T00:00:00.000Z',
        wholeDay: false,
      } as Event;
      const previous = { ...base, maxAttendees: 5 };
      const cleared = normalizeEventDataForSave(base);

      expect(eventDataForDbUpdate(previous, cleared)).toEqual({
        ...base,
        maxAttendees: null,
      });
      expect(eventDataForDbUpdate(cleared, cleared)).toEqual(cleared);
    });

    it('should strip null maxAttendees when reading event data from db', () => {
      const base = {
        type: 'event',
        start: '2023-01-01T00:00:00.000Z',
        wholeDay: false,
      } as Event;

      expect(normalizeEventDataFromDb({ ...base, maxAttendees: null })).toEqual(
        base,
      );
      expect(normalizePostDataFromDb({ ...base, maxAttendees: null })).toEqual(
        base,
      );
    });

    it('should block jam join when capacity event is full', () => {
      const post = {
        ...mockPost,
        type: 'event',
        data: {
          type: 'event',
          start: '2023-01-01T00:00:00.000Z',
          wholeDay: false,
          maxAttendees: 1,
          jam: { moderators: ['mod1'], type: 'video-call' },
        },
        rsvps: [
          {
            response: 'yes',
            profile: { id: 'other' },
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        ],
      } as PublicPost;

      expect(getJamCapacityJoinBlock(post, { id: 'user1' })).toEqual({
        blocked: true,
        reason: 'full',
      });
    });

    it('should require RSVP when capacity event has space', () => {
      const post = {
        ...mockPost,
        type: 'event',
        data: {
          type: 'event',
          start: '2023-01-01T00:00:00.000Z',
          wholeDay: false,
          maxAttendees: 2,
          jam: { moderators: ['mod1'], type: 'video-call' },
        },
        rsvps: [],
      } as PublicPost;

      expect(getJamCapacityJoinBlock(post, { id: 'user1' })).toEqual({
        blocked: true,
        reason: 'rsvp-required',
      });
    });

    it('should allow jam moderators past capacity gate', () => {
      const post = {
        ...mockPost,
        type: 'event',
        data: {
          type: 'event',
          start: '2023-01-01T00:00:00.000Z',
          wholeDay: false,
          maxAttendees: 1,
          jam: { moderators: ['mod1'], type: 'video-call' },
        },
        rsvps: [
          {
            response: 'yes',
            profile: { id: 'other' },
            createdAt: '2023-01-01T00:00:00.000Z',
          },
        ],
      } as PublicPost;

      expect(getJamCapacityJoinBlock(post, { id: 'mod1' })).toEqual({
        blocked: false,
      });
    });
  });

  describe('rsvp cancellations', () => {
    const guest = { ...mockPublicProfile, id: 'guest' };
    const dateA = '2026-09-08T16:00:00.000Z';
    const dateB = '2026-09-15T16:00:00.000Z';
    const rsvp = (
      response: PublicRsvp['response'],
      createdAt: string,
      recurrenceId?: string,
    ): PublicRsvp =>
      ({
        profile: guest,
        response,
        createdAt,
        ...(recurrenceId ? { recurrenceId } : {}),
      }) as PublicRsvp;

    const singleEvent = (rsvps: PublicRsvp[]) =>
      ({
        ...mockEventPost,
        rsvps,
      }) as PublicPost;

    const seriesEvent = (rsvps: PublicRsvp[]) =>
      ({
        ...mockEventPost,
        data: {
          ...mockEventPost.data,
          type: 'event',
          start: dateA,
          recurrence: { freq: 'WEEKLY', count: 2 },
        },
        rsvps,
      }) as PublicPost;

    it('notifies once when a guest leaves a single event', () => {
      const attending = singleEvent([rsvp('yes', '2026-09-01T00:00:00.000Z')]);
      expect(rsvpCancelNotice(attending, 'guest', 'no')).toEqual({
        occurrenceIds: [],
        series: false,
      });
      expect(rsvpCancelNotice(attending, 'guest', 'yes')).toBeUndefined();
    });

    it('does not notify a second cancellation or a decline', () => {
      const declined = singleEvent([rsvp('no', '2026-09-01T00:00:00.000Z')]);
      const canceled = singleEvent([
        rsvp('yes', '2026-09-01T00:00:00.000Z'),
        rsvp('no', '2026-09-02T00:00:00.000Z'),
      ]);
      expect(rsvpCancelNotice(declined, 'guest', 'no')).toBeUndefined();
      expect(rsvpCancelNotice(canceled, 'guest', 'no')).toBeUndefined();
    });

    it('covers one date, several dates, and a whole series', () => {
      const seriesYes = seriesEvent([rsvp('yes', '2026-09-01T00:00:00.000Z')]);
      expect(rsvpCancelNotice(seriesYes, 'guest', 'no', [dateA])).toEqual({
        occurrenceIds: [dateA],
        series: false,
      });
      expect(
        rsvpCancelNotice(seriesYes, 'guest', 'no', [dateA, dateB]),
      ).toEqual({
        occurrenceIds: [dateA, dateB],
        series: false,
      });
      expect(rsvpCancelNotice(seriesYes, 'guest', 'no')).toEqual({
        occurrenceIds: [],
        series: true,
      });
    });

    it('cancels only the instance dates a guest was attending', () => {
      const instances = seriesEvent([
        rsvp('yes', '2026-09-01T00:00:00.000Z', dateA),
        rsvp('no', '2026-09-01T00:00:00.000Z', dateB),
      ]);
      expect(rsvpCancelNotice(instances, 'guest', 'no')).toEqual({
        occurrenceIds: [dateA],
        series: false,
      });
    });

    it('keeps the cancellation in history after the guest RSVPs again', () => {
      const post = singleEvent([
        rsvp('yes', '2026-09-01T00:00:00.000Z'),
        rsvp('no', '2026-09-02T00:00:00.000Z'),
        rsvp('yes', '2026-09-03T00:00:00.000Z'),
      ]);
      const history = listRsvpCancellations(post);
      expect(history).toHaveLength(1);
      expect(history[0]?.canceledAt).toBe('2026-09-02T00:00:00.000Z');
      expect(history[0]?.series).toBe(false);
      expect(listedRsvps(calculateEffectiveRsvps(post))).toHaveLength(1);
      expect(countYesRsvps(post)).toBe(1);
    });

    it('records a series cancellation without a row per overlaid date', () => {
      const post = seriesEvent([
        rsvp('yes', '2026-09-01T00:00:00.000Z'),
        rsvp('no', '2026-09-02T00:00:00.000Z'),
        rsvp('no', '2026-09-02T00:00:01.000Z', dateA),
      ]);
      const history = listRsvpCancellations(post);
      expect(history).toEqual([
        expect.objectContaining({
          canceledAt: '2026-09-02T00:00:00.000Z',
          series: true,
        }),
      ]);
    });

    it('labels a single event with its start and a series as all dates', () => {
      const single = rsvpCancelWhenLabels(singleEvent([]), {
        occurrenceIds: [],
        series: false,
      });
      expect(single.series).toBe(false);
      expect(single.labels).toHaveLength(1);
      expect(
        rsvpCancelWhenLabels(seriesEvent([]), {
          occurrenceIds: [],
          series: true,
        }).series,
      ).toBe(true);
    });
  });

  describe('canDeletePost', () => {
    it('should return true when profile has delete capability', () => {
      const result = canDeletePost(
        {
          profile: mockProfile,
          scopes: [
            { scopeLevel: 'write', resource: { type: 'posts', id: '*' } },
          ],
        },
        mockPost,
        mockCapabilitiesConfig,
      );
      expect(result).toBe(true);
    });

    it('should return false when profile lacks delete capability', () => {
      const configWithoutDelete = {
        ...mockCapabilitiesConfig,
        post: {
          local: { add: [], remove: [] },
          none: { add: [], remove: [] },
          self: { add: [], remove: [] },
          mentioned: { add: [], remove: [] },
          attendee: { add: [], remove: [] },
        },
      };
      const result = canDeletePost(
        {
          profile: mockProfile,
          scopes: [
            { scopeLevel: 'write', resource: { type: 'posts', id: '*' } },
          ],
        },
        mockPost,
        configWithoutDelete,
      );
      expect(result).toBe(false);
    });
  });

  describe('getPostActionAvailability', () => {
    const writeScopes = [
      {
        scopeLevel: 'admin' as const,
        resource: { type: '*' as const, id: '*' },
      },
    ];

    const groupFromTemplate = (
      id: string,
      template: (typeof groupCapabilityTemplates)[keyof typeof groupCapabilityTemplates],
    ) =>
      ({
        id,
        capabilities: template.capabilities,
      }) as GroupWithMeta;

    const memberProfile = (group: GroupWithMeta) =>
      ({
        ...mockProfile,
        memberships: [
          {
            group,
            roles: ['member'],
          },
        ],
      }) as ProfileWithMeta;

    it('disables all actions for a group post when the viewer is not a member', () => {
      const group = groupFromTemplate(
        'g1',
        groupCapabilityTemplates.defaultGroup,
      );
      const post = {
        ...mockPost,
        visibility: 'group',
        groupId: group.id,
        group,
      } as PublicPost;

      expect(
        getPostActionAvailability(
          { profile: mockProfile, scopes: writeScopes },
          post,
          mockCapabilitiesConfig,
        ),
      ).toEqual({
        canReply: false,
        canRepost: false,
        canReact: false,
      });
    });

    it('disables reply and repost for locked-group members without create', () => {
      const group = groupFromTemplate(
        'g-locked',
        groupCapabilityTemplates.lockedGroup,
      );
      const post = {
        ...mockPost,
        visibility: 'group',
        groupId: group.id,
        group,
      } as PublicPost;

      const result = getPostActionAvailability(
        { profile: memberProfile(group), scopes: writeScopes },
        post,
        mockCapabilitiesConfig,
      );
      expect(result.canReply).toBe(false);
      expect(result.canRepost).toBe(false);
    });

    it('allows reply and repost for members who can create group notes', () => {
      const group = groupFromTemplate(
        'g-default',
        groupCapabilityTemplates.defaultGroup,
      );
      const post = {
        ...mockPost,
        visibility: 'group',
        groupId: group.id,
        group,
      } as PublicPost;

      const result = getPostActionAvailability(
        { profile: memberProfile(group), scopes: writeScopes },
        post,
        mockCapabilitiesConfig,
      );
      expect(result.canReply).toBe(true);
      expect(result.canRepost).toBe(true);
    });
  });

  describe('hidden block tombstones', () => {
    it('clears content and author identity', () => {
      const hidden = toHiddenPost({
        ...mockPost,
        data: { type: 'note', content: 'secret' },
        profile: mockPublicProfile,
      });
      expect(isHiddenPost(hidden)).toBe(true);
      expect(hidden.profile.handle).toBe(HIDDEN_AUTHOR_HANDLE);
      expect(
        hidden.data.type === 'note' ? hidden.data.content : 'missing',
      ).toBe('');
    });

    it('detects 1:1 DMs with a blocked participant', () => {
      const dm = {
        ...mockPost,
        visibility: 'direct' as const,
        profile: { id: 'profile1' } as PublicProfile,
        audience: [
          { id: 'profile1' } as PublicProfile,
          { id: 'blocked' } as PublicProfile,
        ],
      };
      expect(
        isOneToOneWithBlocked(dm, { id: 'profile1' }, new Set(['blocked'])),
      ).toBe(true);
      expect(
        isOneToOneWithBlocked(dm, { id: 'profile1' }, new Set(['other'])),
      ).toBe(false);
    });
  });
});
