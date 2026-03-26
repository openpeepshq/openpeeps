import { describe, it, expect } from 'vitest';
import {
  checkCapabilities,
  mergeCapabilities,
  checkRoleCapabilities,
  isLocal,
  localOrNone,
  getGroupRelationships,
  getProfileRelationships,
  getPostRelationships,
  getReportRelationships,
  getGroupCapabilitiesByRoles,
  getGroupCapabilities,
  getProfileCapabilities,
  checkGroupCapabilities,
  checkPostCapabilities,
  checkProfileCapabilities,
  checkReportCapabilities,
  checkAccountCapabilities,
} from '../capabilitiesHelpers';
import type {
  CapabilitiesConfig,
  Role,
  ProfileWithMeta,
  Group,
  PublicProfile,
  PublicPostInput,
  PublicPost,
  PublicReport,
  AccountWithMeta,
  GroupWithMeta,
} from '../../types';

// Mock data for testing

const mockRoles: Role[] = [
  {
    id: 'role1',
    key: 'admin',
    capabilities: {
      add: ['admin-capability'],
      remove: [],
    },
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
    default: true,
    displayName: 'Admin',
    description: 'Admin role',
  },
  {
    id: 'role2',
    key: 'member',
    capabilities: {
      add: ['member-capability'],
      remove: ['restricted-capability'],
    },
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
    default: true,
    displayName: 'Member',
    description: 'Member role',
  },
];

const mockProfile: ProfileWithMeta = {
  id: 'profile1',
  createdAt: '2021-01-01',
  updatedAt: '2021-01-01',
  roles: mockRoles,
  memberships: [],
  type: 'local',
  handle: 'profile1',
  followers: [],
  following: [],
  controllers: [],
  profileStats: {
    posts: 0,
    comments: 0,
    reactions: 0,
    followersCount: 0,
    followingCount: 0,
  },
  followersCount: 0,
  followingCount: 0,
} as ProfileWithMeta;

const mockGroup: Group = {
  id: 'group1',
  capabilities: {
    member: {
      add: ['group-member-capability'],
      remove: [],
    },
  },
} as Group;

const mockPublicProfile: PublicProfile = {
  id: 'public-profile1',
} as PublicProfile;

const mockPost: PublicPost = {
  id: 'post1',
  type: 'note',
  createdAt: '2021-01-01',
  updatedAt: '2021-01-01',
  reactions: [],
  entries: [],
  rsvps: [],
  group: mockGroup as GroupWithMeta,
  profile: mockPublicProfile,
  mentions: [],
  data: {
    type: 'note',
  },
  visibility: 'public',
  repostCount: 0,
  replyCount: 0,
  tags: [],
} as PublicPost;

const mockPostInput: PublicPostInput = {
  id: 'post1',
  group: mockGroup as GroupWithMeta,
  mentions: [],
  entries: [],
  createdAt: '2021-01-01',
  updatedAt: '2021-01-01',
  type: 'note',
  profile: mockPublicProfile,
  data: {
    type: 'note',
  },
  visibility: 'public',
  repostCount: 0,
  replyCount: 0,
  tags: [],
  reactions: [],
  rsvps: [],
} as PublicPostInput;

const mockReport: PublicReport = {
  id: 'report1',
  reporterProfile: mockPublicProfile,
  reportedProfile: mockPublicProfile,
} as PublicReport;

const mockAccount: AccountWithMeta = {
  id: 'account1',
} as AccountWithMeta;

const mockCapabilitiesConfig: CapabilitiesConfig = {
  post: {
    local: { add: ['post-local'], remove: [] },
    none: { add: ['post-none'], remove: [] },
    self: { add: ['post-self'], remove: [] },
    mentioned: { add: ['post-mentioned'], remove: [] },
    attendee: { add: ['post-attendee'], remove: [] },
  },
  profile: {
    local: { add: ['profile-local'], remove: [] },
    none: { add: ['profile-none'], remove: [] },
    self: { add: ['profile-self'], remove: [] },
    followedBy: { add: ['profile-followed-by'], remove: [] },
    following: { add: ['profile-following'], remove: [] },
  },
  report: {
    local: { add: ['report-local'], remove: [] },
    none: { add: ['report-none'], remove: [] },
    reporter: { add: ['report-reporter'], remove: [] },
    reported: { add: ['report-reported'], remove: [] },
  },
};

describe('capabilitiesHelpers', () => {
  describe('checkCapabilities', () => {
    it('should return success when all capabilities are present', () => {
      const result = checkCapabilities(['capability1'], {
        add: ['capability1'],
        remove: [],
      });
      expect(result.success).toBe(true);
      expect(result.missingCapabilities).toEqual([]);
    });

    it('should return failure when capabilities are missing', () => {
      const result = checkCapabilities(['capability1', 'capability4'], {
        add: ['capability1'],
        remove: [],
      });
      expect(result.success).toBe(false);
      expect(result.missingCapabilities).toEqual(['capability4']);
    });

    it('should handle wildcard capabilities', () => {
      const result = checkCapabilities(['capability1'], {
        add: ['capability*'],
        remove: [],
      });
      expect(result.success).toBe(true);
    });

    it('should handle removed capabilities', () => {
      const result = checkCapabilities(['capability1'], {
        add: ['capability1'],
        remove: ['capability1'],
      });
      expect(result.success).toBe(false);
      expect(result.missingCapabilities).toEqual(['capability1']);
    });

    it('should work with empty capabilities', () => {
      const result = checkCapabilities([], { add: [], remove: [] });
      expect(result.success).toBe(true);
      expect(result.missingCapabilities).toEqual([]);
    });

    it('should work with wildcard removals', () => {
      const capabilities = {
        add: ['a-b-*'],
        remove: ['a-b-c-*'],
      };
      const result = checkCapabilities(['a-b-c-d'], capabilities);
      expect(result.success).toBe(false);
      expect(result.missingCapabilities).toEqual(['a-b-c-d']);
    });

  });

  describe('mergeCapabilities', () => {
    it('should merge multiple capabilities', () => {
      const capabilities = [
        { add: ['cap1'], remove: ['cap2'] },
        { add: ['cap3'], remove: ['cap4'] },
      ];
      const result = mergeCapabilities(capabilities);
      expect(result?.add).toEqual(['cap1', 'cap3']);
      expect(result?.remove).toEqual(['cap2', 'cap4']);
    });

    it('should deduplicate capabilities', () => {
      const capabilities = [
        { add: ['cap1', 'cap2'], remove: ['cap3'] },
        { add: ['cap1', 'cap4'], remove: ['cap3', 'cap5'] },
      ];
      const result = mergeCapabilities(capabilities);
      expect(result?.add).toEqual(['cap1', 'cap2', 'cap4']);
      expect(result?.remove).toEqual(['cap3', 'cap5']);
    });

    it('should handle empty capabilities array', () => {
      const result = mergeCapabilities([]);
      expect(result?.add).toEqual([]);
      expect(result?.remove).toEqual([]);
    });

    it('should handle undefined capabilities', () => {
      const result = mergeCapabilities(undefined);
      expect(result?.add).toEqual([]);
      expect(result?.remove).toEqual([]);
    });
  });

  describe('checkRoleCapabilities', () => {
    it('should check capabilities against roles', () => {
      const result = checkRoleCapabilities(['admin-capability'], mockRoles);
      expect(result.success).toBe(true);
    });

    it('should return failure for missing capabilities', () => {
      const result = checkRoleCapabilities(['missing-capability'], mockRoles);
      expect(result.success).toBe(false);
    });

    it('should handle empty roles array', () => {
      const result = checkRoleCapabilities(['any-capability'], []);
      expect(result.success).toBe(false);
    });
  });

  describe('isLocal', () => {
    it('should return true for local profile', () => {
      const localProfile = {
        ...mockProfile,
        roles: [
          {
            id: 'local-role',
            key: 'local',
            capabilities: { add: ['core-local'], remove: [] },
            createdAt: '2021-01-01',
            updatedAt: '2021-01-01',
            default: true,
            displayName: 'Local',
            description: 'Local role',
          },
        ],
      } as ProfileWithMeta;
      expect(isLocal(localProfile)).toBe(true);
    });

    it('should return false for non-local profile', () => {
      expect(isLocal(mockProfile)).toBe(false);
    });
  });

  describe('localOrNone', () => {
    it('should return local and none for local profile', () => {
      const localProfile = {
        ...mockProfile,
        roles: [
          {
            id: 'local-role',
            key: 'local',
            capabilities: { add: ['core-local'], remove: [] },
            createdAt: '2021-01-01',
            updatedAt: '2021-01-01',
            default: true,
            displayName: 'Local',
            description: 'Local role',
          },
        ],
      };
      const result = localOrNone(localProfile);
      expect(result).toEqual(['local', 'none']);
    });

    it('should return only none for non-local profile', () => {
      const result = localOrNone(mockProfile);
      expect(result).toEqual(['none']);
    });

    it('should return only none for undefined profile', () => {
      const result = localOrNone(undefined);
      expect(result).toEqual(['none']);
    });
  });

  describe('getGroupRelationships', () => {
    it('should return relationships for profile and group', () => {
      const result = getGroupRelationships(mockProfile, mockGroup);
      expect(result).toContain('none');
    });

    it('should include local relationship for local profile', () => {
      const localProfile = {
        ...mockProfile,
        roles: [
          {
            id: 'local-role',
            key: 'local',
            capabilities: { add: ['core-local'], remove: [] },
            createdAt: '2021-01-01',
            updatedAt: '2021-01-01',
            default: true,
            displayName: 'Local',
            description: 'Local role',
          },
        ],
      } as ProfileWithMeta;
      const result = getGroupRelationships(localProfile, mockGroup);
      expect(result).toContain('local');
      expect(result).toContain('none');
    });
  });

  describe('getProfileRelationships', () => {
    it('should return self relationship for same profile', () => {
      const result = getProfileRelationships(
        mockProfile,
        mockProfile as PublicProfile,
      );
      expect(result).toContain('self');
    });

    it('should return relationships for different profile', () => {
      const result = getProfileRelationships(mockProfile, mockPublicProfile);
      expect(result).toContain('none');
    });

    it('should handle undefined profile', () => {
      const result = getProfileRelationships(undefined, mockPublicProfile);
      expect(result).toEqual(['none']);
    });
  });

  describe('getPostRelationships', () => {
    it('should return relationships for post without group', () => {
      const postWithoutGroup = { ...mockPostInput, group: null };
      const result = getPostRelationships(mockProfile, postWithoutGroup);
      expect(result).toContain('none');
    });

    it('should return empty array for post with group', () => {
      const result = getPostRelationships(mockProfile, mockPostInput);
      expect(result).toEqual([]);
    });

    it('should handle undefined profile', () => {
      const result = getPostRelationships(undefined, mockPostInput);
      expect(result).toEqual([]);
    });
  });

  describe('getReportRelationships', () => {
    it('should return reporter relationship for reporter profile', () => {
      const result = getReportRelationships(mockProfile, {
        ...mockReport,
        reporterProfile: mockProfile as PublicProfile,
      });
      expect(result).toContain('reporter');
    });

    it('should return reported relationship for reported profile', () => {
      const result = getReportRelationships(mockProfile, {
        ...mockReport,
        reportedProfile: mockProfile as PublicProfile,
      });
      expect(result).toContain('reported');
    });

    it('should handle undefined profile', () => {
      const result = getReportRelationships(undefined, mockReport);
      expect(result).toEqual(['none']);
    });
  });

  describe('getGroupCapabilitiesByRoles', () => {
    it('should return capabilities for roles', () => {
      const result = getGroupCapabilitiesByRoles(['member'], mockGroup);
      expect(result?.add).toContain('group-member-capability');
    });

    it('should handle null roles', () => {
      const result = getGroupCapabilitiesByRoles(null, mockGroup);
      expect(result?.add).toEqual([]);
      expect(result?.remove).toEqual([]);
    });

    it('should handle undefined group', () => {
      const result = getGroupCapabilitiesByRoles(['member'], undefined);
      expect(result?.add).toEqual([]);
      expect(result?.remove).toEqual([]);
    });
  });

  describe('getGroupCapabilities', () => {
    it('should return group capabilities', () => {
      const result = getGroupCapabilities(mockProfile, mockGroup);
      expect(result).toBeDefined();
    });

    it('should handle undefined profile', () => {
      const result = getGroupCapabilities(undefined, mockGroup);
      expect(result).toBeDefined();
    });
  });

  describe('getProfileCapabilities', () => {
    it('should return profile capabilities', () => {
      const result = getProfileCapabilities(
        mockProfile,
        mockPublicProfile,
        mockCapabilitiesConfig,
      );
      expect(result).toBeDefined();
    });
  });

  describe('checkGroupCapabilities', () => {
    it('should check group capabilities', () => {
      const result = checkGroupCapabilities(
        ['group-member-capability'],
        mockProfile,
        mockGroup,
      );
      expect(result).toBeDefined();
    });
  });

  describe('checkPostCapabilities', () => {
    it('should check post capabilities', () => {
      const result = checkPostCapabilities(
        ['post-local'],
        mockProfile,
        mockPost,
        mockCapabilitiesConfig,
      );
      expect(result).toBeDefined();
    });
  });

  describe('checkProfileCapabilities', () => {
    it('should check profile capabilities', () => {
      const result = checkProfileCapabilities(
        ['profile-local'],
        mockProfile,
        mockPublicProfile,
        mockCapabilitiesConfig,
      );
      expect(result).toBeDefined();
    });
  });

  describe('checkReportCapabilities', () => {
    it('should check report capabilities', () => {
      const result = checkReportCapabilities(
        ['report-local'],
        mockProfile,
        mockReport,
        mockCapabilitiesConfig,
      );
      expect(result).toBeDefined();
    });
  });

  describe('checkAccountCapabilities', () => {
    it('should check account capabilities for same account', () => {
      const result = checkAccountCapabilities(
        ['core-accounts-update'],
        mockAccount,
        mockProfile,
        mockAccount,
      );
      expect(result.success).toBe(true);
    });

    it('should check account capabilities for different account', () => {
      const otherAccount = { id: 'account2' } as AccountWithMeta;
      const result = checkAccountCapabilities(
        ['core-accounts-update'],
        mockAccount,
        mockProfile,
        otherAccount,
      );
      expect(result.success).toBe(false);
    });
  });
});
