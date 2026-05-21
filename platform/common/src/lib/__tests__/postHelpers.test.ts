import { describe, it, expect } from 'vitest';
import {
  buildThreads,
  getJamUrl,
  jamFromEvent,
  getReactionCount,
  countVotes,
  collectVotes,
  calculateEffectiveRsvps,
  canDeletePost,
} from '../postHelpers';
import type {
  PublicPost,
  PublicProfile,
  Jam,
  Question,
  Answer,
  ProfileWithMeta,
  CapabilitiesConfig,
  EntryWithPublicProfile,
  PublicRsvp,
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

  describe('getJamUrl', () => {
    it('should return jam URL with origin', () => {
      const result = getJamUrl('jam1', 'https://example.com');
      expect(result).toBe('https://example.com/events/jam1/jam');
    });

    it('should return jam URL without origin', () => {
      const result = getJamUrl('jam1', undefined);
      expect(result).toBe('/events/jam1/jam');
    });

    it('should return empty string for empty id', () => {
      const result = getJamUrl('', 'https://example.com');
      expect(result).toBe('');
    });
  });

  describe('jamFromEvent', () => {
    it('should return jam from event post', () => {
      const result = jamFromEvent(mockEventPost);
      expect(result).toEqual(
        {
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
      );
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

    it('should deduplicate RSVPs by profile', () => {
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
            createdAt: '2023-01-01T00:00:00Z',
          },
          {
            profile: { ...mockPublicProfile, id: 'profile2' },
            response: 'maybe',
            createdAt: '2023-01-01T00:00:00Z',
          },
        ] as PublicRsvp[],
      };
      const result = calculateEffectiveRsvps(postWithDuplicateRsvps);
      expect(result).toHaveLength(2);
    });
  });

  describe('canDeletePost', () => {
    it('should return true when profile has delete capability', () => {
      const result = canDeletePost(
        {
          profile: mockProfile,
          scopes: [{ scopeLevel: 'write', resource: { type: 'posts', id: '*' } }],
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
          scopes: [{ scopeLevel: 'write', resource: { type: 'posts', id: '*' } }],
        },
        mockPost,
        configWithoutDelete,
      );
      expect(result).toBe(false);
    });
  });
});
