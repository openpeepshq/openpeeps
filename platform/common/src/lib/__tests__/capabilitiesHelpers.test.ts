import { describe, it, expect } from 'vitest';
import {
  checkCapabilities,
  mergeCapabilities,
  checkRoleCapabilities,
  hasAdminSidebarAccess,
  isLocal,
  localOrNone,
  getGroupRelationships,
  getProfileRelationships,
  getPostRelationships,
  getReportRelationships,
  getAccessTokenRelationships,
  getGroupCapabilitiesByRoles,
  getGroupCapabilities,
  getProfileCapabilities,
  checkGroupCapabilities,
  checkPostCapabilities,
  getPostCapabilities,
  checkProfileCapabilities,
  checkReportCapabilities,
  checkAccessTokenCapabilities,
  checkAccountCapabilities,
  checkAccountCreateAuthorization,
  ACCOUNT_CREATE_CAPABILITY,
} from '../capabilitiesHelpers';
import type {
  AccessTokenWithMeta,
  AuthorizationData,
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
  Scope,
} from '../../types';

// Mock data for testing

const mockAccountAdminSelfScopes: Scope[] = [
  { scopeLevel: 'admin', resource: { type: 'self' } },
];

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
  reposts: [],
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
  reposts: [],
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

const authData = (
  overrides: Partial<AuthorizationData> = {},
): AuthorizationData => ({
  profile: mockProfile,
  scopes: [],
  ...overrides,
});

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
    'followed-by': { add: ['profile-followed-by'], remove: [] },
    following: { add: ['profile-following'], remove: [] },
  },
  report: {
    local: { add: ['report-local'], remove: [] },
    none: { add: ['report-none'], remove: [] },
    reporter: { add: ['report-reporter'], remove: [] },
    reported: { add: ['report-reported'], remove: [] },
  },
  accessToken: {
    none: { add: ['token-none'], remove: [] },
    local: { add: ['token-local'], remove: [] },
    owner: { add: ['core-serviceTokens-read'], remove: [] },
  },
};

const mockAccessToken = {
  id: 'token-1',
  ownedBy: { id: 'profile1' },
} as AccessTokenWithMeta;

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
      const result = checkRoleCapabilities(mockRoles, ['admin-capability']);
      expect(result.success).toBe(true);
    });

    it('should return failure for missing capabilities', () => {
      const result = checkRoleCapabilities(mockRoles, ['missing-capability']);
      expect(result.success).toBe(false);
    });

    it('should handle empty roles array', () => {
      const result = checkRoleCapabilities([], ['any-capability']);
      expect(result.success).toBe(false);
    });
  });

  describe('hasAdminSidebarAccess', () => {
    it('grants access for any admin sidebar capability', () => {
      expect(
        hasAdminSidebarAccess([
          {
            ...mockRoles[0],
            capabilities: { add: ['core-analytics-read'], remove: [] },
          },
        ]),
      ).toBe(true);
    });

    it('denies access without admin sidebar capabilities', () => {
      expect(hasAdminSidebarAccess(mockRoles)).toBe(false);
      expect(hasAdminSidebarAccess([])).toBe(false);
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
      } as ProfileWithMeta;
      const result = localOrNone(authData({ profile: localProfile }));
      expect(result).toEqual(['local', 'none']);
    });

    it('should return only none for non-local profile', () => {
      const result = localOrNone(authData());
      expect(result).toEqual(['none']);
    });

    it('should return only none for missing profile and service', () => {
      const result = localOrNone(authData({ profile: undefined }));
      expect(result).toEqual(['none']);
    });

    it('should return local and none for service token without profile', () => {
      const result = localOrNone(
        authData({ profile: undefined, service: 'service-1' }),
      );
      expect(result).toEqual(['local', 'none']);
    });

    it('should return local and none for service token with non-local profile', () => {
      const result = localOrNone(authData({ service: 'service-1' }));
      expect(result).toEqual(['local', 'none']);
    });
  });

  describe('getGroupRelationships', () => {
    it('should return relationships for profile and group', () => {
      const result = getGroupRelationships(authData(), mockGroup);
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
      const result = getGroupRelationships(
        authData({ profile: localProfile }),
        mockGroup,
      );
      expect(result).toContain('local');
      expect(result).toContain('none');
    });

    it('should include local and none for service token without profile', () => {
      const result = getGroupRelationships(
        authData({ profile: undefined, service: 'service-1' }),
        mockGroup,
      );
      expect(result).toEqual(['local', 'none']);
    });

    it('should include membership edge roles for the group', () => {
      const memberProfile = {
        ...mockProfile,
        memberships: [
          {
            group: { id: 'group1' },
            roles: ['member', 'moderator'],
          },
        ],
      } as ProfileWithMeta;
      const result = getGroupRelationships(
        authData({ profile: memberProfile }),
        mockGroup,
      );
      expect(result).toEqual(
        expect.arrayContaining(['local', 'none', 'member', 'moderator']),
      );
    });
  });

  describe('getProfileRelationships', () => {
    it('should return self relationship for same profile', () => {
      const result = getProfileRelationships(
        authData(),
        mockProfile as PublicProfile,
      );
      expect(result).toContain('self');
    });

    it('should return relationships for different profile', () => {
      const result = getProfileRelationships(authData(), mockPublicProfile);
      expect(result).toContain('none');
    });

    it('should handle missing profile', () => {
      const result = getProfileRelationships(
        authData({ profile: undefined }),
        mockPublicProfile,
      );
      expect(result).toEqual(['none']);
    });

    it('should include local and none for service token without profile', () => {
      const result = getProfileRelationships(
        authData({ profile: undefined, service: 'service-1' }),
        mockPublicProfile,
      );
      expect(result).toEqual(['local', 'none']);
    });

    it('should include following and followed-by relationships', () => {
      const networked = {
        ...mockProfile,
        following: [{ id: 'public-profile1' }],
        followers: [{ id: 'public-profile1' }],
      } as ProfileWithMeta;
      const result = getProfileRelationships(
        authData({ profile: networked }),
        mockPublicProfile,
      );
      expect(result).toEqual(
        expect.arrayContaining(['following', 'followed-by', 'none']),
      );
    });
  });

  describe('getPostRelationships', () => {
    it('should return relationships for post without group', () => {
      const postWithoutGroup = { ...mockPostInput, group: null };
      const result = getPostRelationships(authData(), postWithoutGroup);
      expect(result).toContain('none');
    });

    it('should return localOrNone for public post (group does not change relationships)', () => {
      const result = getPostRelationships(authData(), mockPostInput);
      expect(result).toEqual([...localOrNone(authData())]);
    });

    it('should handle missing profile for public post', () => {
      const result = getPostRelationships(
        authData({ profile: undefined }),
        mockPostInput,
      );
      expect(result).toEqual(['none']);
    });

    it('should include local and none for service token on public post', () => {
      const result = getPostRelationships(
        authData({ profile: undefined, service: 'service-1' }),
        mockPostInput,
      );
      expect(result).toEqual(['local', 'none']);
    });

    it('should include audience, mentioned, and attendee relationships', () => {
      const post = {
        ...mockPostInput,
        visibility: 'direct',
        audience: [{ id: 'profile1' }],
        mentions: [{ profile: { id: 'profile1' } }],
        entries: [
          {
            type: 'rsvp',
            profile: { id: 'profile1' },
            data: { response: 'yes' },
          },
        ],
      } as PublicPostInput;
      const result = getPostRelationships(authData(), post);
      expect(result).toEqual(
        expect.arrayContaining(['audience', 'mentioned', 'attendee']),
      );
      expect(result).not.toContain('none');
    });
  });

  describe('getReportRelationships', () => {
    it('should return reporter relationship for reporter profile', () => {
      const result = getReportRelationships(authData(), {
        ...mockReport,
        reporterProfile: mockProfile as PublicProfile,
      });
      expect(result).toContain('reporter');
    });

    it('should return reported relationship for reported profile', () => {
      const result = getReportRelationships(authData(), {
        ...mockReport,
        reportedProfile: mockProfile as PublicProfile,
      });
      expect(result).toContain('reported');
    });

    it('should handle missing profile', () => {
      const result = getReportRelationships(
        authData({ profile: undefined }),
        mockReport,
      );
      expect(result).toEqual(['none']);
    });

    it('should include local and none for service token without profile', () => {
      const result = getReportRelationships(
        authData({ profile: undefined, service: 'service-1' }),
        mockReport,
      );
      expect(result).toEqual(['local', 'none']);
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
      const result = getGroupCapabilities(authData(), mockGroup);
      expect(result).toBeDefined();
    });

    it('should handle undefined profile', () => {
      const result = getGroupCapabilities(
        authData({ profile: undefined }),
        mockGroup,
      );
      expect(result).toBeDefined();
    });

    it('should not include instance-role capabilities', () => {
      // mockProfile holds the instance `admin` role (`admin-capability`) but has
      // no membership edge in mockGroup, so per-group powers must not leak in.
      const result = getGroupCapabilities(authData(), mockGroup);
      expect(result.add).not.toContain('admin-capability');
    });

    it('should grant member capabilities when membership roles match', () => {
      const memberProfile = {
        ...mockProfile,
        memberships: [{ group: { id: 'group1' }, roles: ['member'] }],
      } as ProfileWithMeta;
      const result = getGroupCapabilities(
        authData({ profile: memberProfile }),
        mockGroup,
      );
      expect(result.add).toContain('group-member-capability');
    });
  });

  describe('getProfileCapabilities', () => {
    it('should return profile capabilities', () => {
      const result = getProfileCapabilities(
        authData(),
        mockPublicProfile,
        mockCapabilitiesConfig,
      );
      expect(result).toBeDefined();
    });
  });

  describe('checkGroupCapabilities', () => {
    it('should check group capabilities', () => {
      const result = checkGroupCapabilities(
        authData(),
        ['group-member-capability'],
        mockGroup,
      );
      expect(result).toBeDefined();
    });

    it('allows anonymous reads when none grants core-groups-read', () => {
      const publicGroup = {
        ...mockGroup,
        capabilities: {
          none: { add: ['core-groups-read'], remove: [] },
        },
      } as GroupWithMeta;
      const result = checkGroupCapabilities(
        authData({ profile: undefined, scopes: [] }),
        ['core-groups-read'],
        publicGroup,
      );
      expect(result.success).toBe(true);
      expect(result.missingScope).toBeUndefined();
    });

    it('denies anonymous reads when none does not grant core-groups-read', () => {
      const privateGroup = {
        ...mockGroup,
        capabilities: {
          member: { add: ['core-groups-read'], remove: [] },
        },
      } as GroupWithMeta;
      const result = checkGroupCapabilities(
        authData({ profile: undefined, scopes: [] }),
        ['core-groups-read'],
        privateGroup,
      );
      expect(result.success).toBe(false);
    });
  });

  describe('checkPostCapabilities', () => {
    it('should check post capabilities', () => {
      const result = checkPostCapabilities(
        authData(),
        ['post-local'],
        mockPost,
        mockCapabilitiesConfig,
      );
      expect(result).toBeDefined();
    });

    it('should allow admin-scoped token reads for local posts without a profile', () => {
      const result = checkPostCapabilities(
        authData({
          profile: undefined,
          scopes: [
            { scopeLevel: 'admin', resource: { type: 'posts', id: '*' } },
          ],
        }),
        ['core-posts-read'],
        { ...mockPost, visibility: 'local', group: null },
        mockCapabilitiesConfig,
      );
      expect(result.success).toBe(true);
    });

    it('should not allow read-scoped token reads for local posts', () => {
      const result = checkPostCapabilities(
        authData({
          profile: undefined,
          scopes: [
            { scopeLevel: 'read', resource: { type: 'posts', id: '*' } },
          ],
        }),
        ['core-posts-read'],
        { ...mockPost, visibility: 'local', group: null },
        mockCapabilitiesConfig,
      );
      expect(result.success).toBe(false);
    });

    it('should not allow anonymous reads of local posts (only public)', () => {
      const caps = getPostCapabilities(
        authData({ profile: undefined }),
        { ...mockPost, visibility: 'local', group: null },
        mockCapabilitiesConfig,
      );
      expect(checkCapabilities(['core-posts-read'], caps).success).toBe(false);
    });

    it('should allow anonymous reads of public posts', () => {
      const caps = getPostCapabilities(
        authData({ profile: undefined }),
        { ...mockPost, visibility: 'public', group: null },
        mockCapabilitiesConfig,
      );
      expect(checkCapabilities(['core-posts-read'], caps).success).toBe(true);
    });

    it('should allow anonymous checkPostCapabilities reads of public posts', () => {
      const result = checkPostCapabilities(
        authData({ profile: undefined, scopes: [] }),
        ['core-posts-read'],
        { ...mockPost, visibility: 'public', group: null },
        mockCapabilitiesConfig,
      );
      expect(result.success).toBe(true);
      expect(result.missingScope).toBeUndefined();
    });

    it('should not throw when a group has no capabilities map', () => {
      const groupWithoutCapabilities = {
        ...mockGroup,
        capabilities: undefined,
      } as unknown as GroupWithMeta;
      expect(() =>
        getPostCapabilities(
          authData({ profile: undefined }),
          { ...mockPost, visibility: 'local', group: groupWithoutCapabilities },
          mockCapabilitiesConfig,
        ),
      ).not.toThrow();
    });

    it('should allow scoped token reads for posts in public groups', () => {
      const publicGroup = {
        ...mockGroup,
        capabilities: {
          none: { add: ['core-posts-read'], remove: [] },
        },
      } as GroupWithMeta;
      const result = checkPostCapabilities(
        authData({
          profile: undefined,
          scopes: [
            { scopeLevel: 'read', resource: { type: 'posts', id: '*' } },
          ],
        }),
        ['core-posts-read'],
        { ...mockPost, visibility: 'group', group: publicGroup },
        mockCapabilitiesConfig,
      );
      expect(result.success).toBe(true);
    });

    it('should not grant instance-role capabilities on group posts', () => {
      // Instance admin (`core-posts-*`) with no membership edge in the group
      // must not gain per-group post powers; group posts are edge-driven.
      const instanceAdmin = {
        ...mockProfile,
        roles: [
          {
            ...mockRoles[0],
            capabilities: { add: ['core-posts-*'], remove: [] },
          },
        ],
        memberships: [],
      } as ProfileWithMeta;
      const memberOnlyGroup = {
        ...mockGroup,
        capabilities: { member: { add: ['core-posts-read'], remove: [] } },
      } as GroupWithMeta;
      const caps = getPostCapabilities(
        authData({ profile: instanceAdmin }),
        {
          ...mockPost,
          visibility: 'group',
          group: memberOnlyGroup,
          profile: { id: 'someone-else' } as PublicProfile,
        },
        mockCapabilitiesConfig,
      );
      expect(checkCapabilities(['core-posts-read'], caps).success).toBe(false);
      expect(checkCapabilities(['core-posts-delete'], caps).success).toBe(
        false,
      );
    });

    it('should still grant instance-role capabilities on local posts', () => {
      // Local moderation stays instance-role driven (regression guard).
      const instanceModerator = {
        ...mockProfile,
        roles: [
          {
            ...mockRoles[0],
            capabilities: { add: ['core-posts-delete'], remove: [] },
          },
        ],
        memberships: [],
      } as ProfileWithMeta;
      const caps = getPostCapabilities(
        authData({ profile: instanceModerator }),
        {
          ...mockPost,
          visibility: 'local',
          group: null,
          profile: { id: 'someone-else' } as PublicProfile,
        },
        mockCapabilitiesConfig,
      );
      expect(checkCapabilities(['core-posts-delete'], caps).success).toBe(true);
    });
  });

  describe('checkProfileCapabilities', () => {
    it('should check profile capabilities', () => {
      const result = checkProfileCapabilities(
        authData(),
        ['profile-local'],
        mockPublicProfile,
        mockCapabilitiesConfig,
      );
      expect(result).toBeDefined();
    });

    it('grants following capabilities from profile relationships', () => {
      const networked = {
        ...mockProfile,
        following: [{ id: 'public-profile1' }],
      } as ProfileWithMeta;
      const caps = getProfileCapabilities(
        authData({ profile: networked }),
        mockPublicProfile,
        mockCapabilitiesConfig,
      );
      expect(caps.add).toContain('profile-following');
    });
  });

  describe('checkReportCapabilities', () => {
    it('should check report capabilities', () => {
      const result = checkReportCapabilities(
        authData(),
        ['report-local'],
        mockReport,
        mockCapabilitiesConfig,
      );
      expect(result).toBeDefined();
    });

    it('grants reporter capabilities to the reporting profile', () => {
      const caps = checkReportCapabilities(
        authData({
          scopes: [
            {
              scopeLevel: 'admin',
              resource: { type: 'reports', id: 'report1' },
            },
          ],
        }),
        ['report-reporter'],
        {
          ...mockReport,
          reporterProfile: mockProfile as PublicProfile,
        },
        mockCapabilitiesConfig,
      );
      expect(caps.success).toBe(true);
    });
  });

  describe('access token capabilities', () => {
    it('marks the owning profile as owner', () => {
      expect(
        getAccessTokenRelationships(authData(), mockAccessToken),
      ).toContain('owner');
      expect(
        getAccessTokenRelationships(
          authData({
            profile: { ...mockProfile, id: 'other' } as ProfileWithMeta,
          }),
          mockAccessToken,
        ),
      ).not.toContain('owner');
    });

    it('allows owners to read their service tokens with admin self scope', () => {
      const result = checkAccessTokenCapabilities(
        authData({ scopes: mockAccountAdminSelfScopes }),
        ['core-serviceTokens-read'],
        mockAccessToken,
        mockCapabilitiesConfig,
      );
      expect(result.success).toBe(true);
    });

    it('denies token reads without matching capabilities or scope', () => {
      const result = checkAccessTokenCapabilities(
        authData({
          profile: { ...mockProfile, id: 'other' } as ProfileWithMeta,
          scopes: [],
        }),
        ['core-serviceTokens-read'],
        mockAccessToken,
        mockCapabilitiesConfig,
      );
      expect(result.success).toBe(false);
    });
  });

  describe('checkAccountCapabilities', () => {
    it('should check account capabilities for same account', () => {
      const result = checkAccountCapabilities(
        authData({ account: mockAccount, scopes: mockAccountAdminSelfScopes }),
        ['core-accounts-update'],
        mockAccount,
      );
      expect(result.success).toBe(true);
    });

    it('should check account capabilities for different account', () => {
      const otherAccount = { id: 'account2' } as AccountWithMeta;
      const result = checkAccountCapabilities(
        authData({ account: mockAccount, scopes: mockAccountAdminSelfScopes }),
        ['core-accounts-update'],
        otherAccount,
      );
      expect(result.success).toBe(false);
    });
  });

  describe('checkAccountCreateAuthorization', () => {
    const writeProfilesScope: Scope[] = [
      { scopeLevel: 'write', resource: { type: 'profiles', id: '*' } },
    ];

    it('allows service tokens with write profiles scope', () => {
      const result = checkAccountCreateAuthorization(
        authData({
          profile: undefined,
          service: 'svc-1',
          scopes: writeProfilesScope,
        }),
      );
      expect(result.success).toBe(true);
    });

    it('rejects service tokens with only read profiles scope', () => {
      const result = checkAccountCreateAuthorization(
        authData({
          profile: undefined,
          service: 'svc-1',
          scopes: [
            { scopeLevel: 'read', resource: { type: 'profiles', id: '*' } },
          ],
        }),
      );
      expect(result.success).toBe(false);
      expect(result.missingScope?.scopeLevel).toBe('write');
    });

    it('allows profile tokens with create capability and matching scope', () => {
      const result = checkAccountCreateAuthorization(
        authData({
          profile: {
            ...mockProfile,
            roles: [
              {
                ...mockRoles[0],
                capabilities: { add: [ACCOUNT_CREATE_CAPABILITY], remove: [] },
              },
            ],
          },
          scopes: writeProfilesScope,
        }),
      );
      expect(result.success).toBe(true);
    });

    it('rejects profile tokens missing create capability', () => {
      const result = checkAccountCreateAuthorization(
        authData({ scopes: writeProfilesScope }),
      );
      expect(result.success).toBe(false);
      expect(result.missingCapabilities).toContain(ACCOUNT_CREATE_CAPABILITY);
    });
  });
});
