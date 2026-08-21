import { describe, it, expect } from 'vitest';
import {
  buildThreads,
  getReactionCount,
  countVotes,
  collectVotes,
  resolvePollOptionContents,
  calculateEffectiveRsvps,
  countYesRsvps,
  getEffectiveRsvp,
  isCapacityEvent,
  normalizeEventDataForSave,
  normalizeEventDataFromDb,
  normalizePostDataFromDb,
  eventDataForDbUpdate,
  getJamCapacityJoinBlock,
  canDeletePost,
  getPostActionAvailability,
} from '../postHelpers';
import { groupCapabilityTemplates } from '../groupHelpers';
import {
  getJamUrl,
  jamFromEvent,
  jamRoomName,
  postIdFromJamRoomName,
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
    it('builds a room name from the occurrence', () => {
      expect(jamRoomName('abc', '2026-09-08T16:00:00.000Z')).toBe(
        'abc_2026-09-08T16-00-00-000Z',
      );
    });

    it('extracts the post id from an occurrence room name', () => {
      const postId = '11111111-1111-1111-1111-111111111111';
      expect(
        postIdFromJamRoomName(jamRoomName(postId, '2026-09-08T16:00:00.000Z')),
      ).toBe(postId);
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

    it('should use null maxAttendees for Arango when clearing capacity', () => {
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
});
