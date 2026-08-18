import { describe, it, expect } from 'vitest';
import {
  clampProfileDisplayName,
  profileName,
  matchesQuery,
  inviteLinkMatchesQuery,
  sortProfiles,
  isDeletedProfile,
  toPublicDeletedProfile,
  toDeletedProfileWithMeta,
  tombstoneProfileWithMetaIfDeleted,
  anonymizeProfileIfDeleted,
  DELETED_AUTHOR_DISPLAY_NAME,
  DELETED_AUTHOR_HANDLE,
} from '../profileHelpers';
import {
  profileWithMetaSchema,
  publicProfileSchema,
  type ProfileWithMeta,
  type PublicProfile,
  type GroupWithMeta,
  type InviteLinkWithMeta,
} from '../../types';

// Mock data for testing
const mockProfile: PublicProfile = {
  id: 'profile1',
  displayName: 'John Doe',
  handle: 'johndoe',
} as PublicProfile;

const deletedProfile: PublicProfile = {
  id: '11111111-1111-4111-8111-111111111111',
  type: 'local',
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-06-01T00:00:00.000Z',
  deletedAt: '2024-06-01T00:00:00.000Z',
  handle: 'realhandle',
  displayName: 'Real Name',
  avatar: 'https://example.com/avatar.png',
  header: 'https://example.com/header.png',
  bio: 'secret bio',
  memberships: [],
};

const mockGroup: GroupWithMeta = {
  id: 'group1',
  displayName: 'Test Group',
  handle: 'testgroup',
} as GroupWithMeta;

const mockInviteLink: InviteLinkWithMeta = {
  id: 'invite1',
  slug: 'test-invite',
  profile: mockProfile,
  groups: [],
} as unknown as InviteLinkWithMeta;

describe('profileHelpers', () => {
  describe('deleted profile presentation', () => {
    it('detects soft-deleted profiles', () => {
      expect(isDeletedProfile(deletedProfile)).toBe(true);
      expect(isDeletedProfile(mockProfile)).toBe(false);
      expect(isDeletedProfile(undefined)).toBe(false);
      expect(isDeletedProfile({ deletedAt: null })).toBe(false);
    });

    it('anonymizes deleted profiles for public surfaces', () => {
      const result = toPublicDeletedProfile(deletedProfile);
      expect(result.id).toBe(deletedProfile.id);
      expect(result.deletedAt).toBe(deletedProfile.deletedAt);
      expect(result.displayName).toBe(DELETED_AUTHOR_DISPLAY_NAME);
      expect(result.handle).toBe(DELETED_AUTHOR_HANDLE);
      expect(result.avatar).toBeNull();
      expect(result.header).toBeNull();
      expect(result.bio).toBeUndefined();
      expect(result.memberships).toEqual([]);
      expect(publicProfileSchema.parse(result)).toMatchObject({
        handle: DELETED_AUTHOR_HANDLE,
        displayName: DELETED_AUTHOR_DISPLAY_NAME,
      });
    });

    it('leaves active profiles unchanged', () => {
      expect(anonymizeProfileIfDeleted(mockProfile)).toBe(mockProfile);
      expect(anonymizeProfileIfDeleted(undefined)).toBeUndefined();
    });
  });

  describe('ProfileWithMeta tombstone', () => {
    const deletedWithMeta = {
      id: '22222222-2222-4222-8222-222222222222',
      type: 'local',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-06-01T00:00:00.000Z',
      deletedAt: '2024-06-01T00:00:00.000Z',
      handle: 'realhandle',
      displayName: 'Real Name',
      avatar: 'https://example.com/avatar.png',
      bio: 'secret bio',
      timeZone: 'Europe/Berlin',
      guestData: { email: 'private@example.com' },
      roles: [{ key: 'member' }],
      followers: [{ id: 'f1' }],
      following: [{ id: 'g1' }],
      controllers: [{ id: 'acc1', email: 'private@example.com' }],
      memberships: [{ group: { id: 'grp1' } }],
      profileStats: { followersCount: 3, followingCount: 5 },
    } as unknown as ProfileWithMeta;

    it('strips PII and keeps identity/timestamps', () => {
      const result = toDeletedProfileWithMeta(deletedWithMeta);
      expect(result.id).toBe(deletedWithMeta.id);
      expect(result.deletedAt).toBe(deletedWithMeta.deletedAt);
      expect(result.handle).toBe(DELETED_AUTHOR_HANDLE);
      expect(result.displayName).toBe(DELETED_AUTHOR_DISPLAY_NAME);
      expect(result.avatar).toBeNull();
      expect(result.roles).toEqual([]);
      expect(result.followers).toEqual([]);
      expect(result.following).toEqual([]);
      expect(result.controllers).toEqual([]);
      expect(result.memberships).toEqual([]);
      expect(result.profileStats).toEqual({
        followersCount: 0,
        followingCount: 0,
      });
      // No leaked PII fields survive the explicit rebuild.
      expect(
        (result as unknown as Record<string, unknown>).bio,
      ).toBeUndefined();
      expect(
        (result as unknown as Record<string, unknown>).timeZone,
      ).toBeUndefined();
      expect(
        (result as unknown as Record<string, unknown>).guestData,
      ).toBeUndefined();
    });

    it('validates against the internal profileWithMetaSchema', () => {
      expect(() =>
        profileWithMetaSchema.parse(toDeletedProfileWithMeta(deletedWithMeta)),
      ).not.toThrow();
    });

    it('only tombstones soft-deleted profiles', () => {
      expect(tombstoneProfileWithMetaIfDeleted(undefined)).toBeUndefined();
      const active = { ...deletedWithMeta, deletedAt: null };
      expect(tombstoneProfileWithMetaIfDeleted(active)).toBe(active);
      expect(tombstoneProfileWithMetaIfDeleted(deletedWithMeta)?.handle).toBe(
        DELETED_AUTHOR_HANDLE,
      );
    });
  });

  describe('clampProfileDisplayName', () => {
    it('truncates names longer than 30 characters', () => {
      expect(clampProfileDisplayName('Nikoraus costantine shitungulu ')).toBe(
        'Nikoraus costantine shitungulu',
      );
    });

    it('returns undefined for empty values', () => {
      expect(clampProfileDisplayName(undefined)).toBeUndefined();
      expect(clampProfileDisplayName('')).toBeUndefined();
    });
  });

  describe('profileName', () => {
    it('should return displayName when available', () => {
      const result = profileName(mockProfile);
      expect(result).toBe('John Doe');
    });

    it('should return handle when displayName is not available', () => {
      const profileWithoutDisplayName = {
        ...mockProfile,
        displayName: undefined,
      };
      const result = profileName(profileWithoutDisplayName);
      expect(result).toBe('johndoe');
    });

    it('should return undefined for undefined profile', () => {
      const result = profileName(undefined);
      expect(result).toBeUndefined();
    });
  });

  describe('matchesQuery', () => {
    it('should match by handle', () => {
      const result = matchesQuery(mockProfile, 'john');
      expect(result).toBe(true);
    });

    it('should match by displayName', () => {
      const result = matchesQuery(mockProfile, 'Doe');
      expect(result).toBe(true);
    });

    it('should match handle with @ prefix', () => {
      const result = matchesQuery(mockProfile, '@johndoe');
      expect(result).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = matchesQuery(mockProfile, 'JOHN');
      expect(result).toBe(true);
    });

    it('should not match when query is not found', () => {
      const result = matchesQuery(mockProfile, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should work with group profiles', () => {
      const result = matchesQuery(mockGroup, 'test');
      expect(result).toBe(true);
    });

    it('should handle undefined profile', () => {
      const result = matchesQuery(undefined, 'test');
      expect(result).toBe(false);
    });

    it('should respect query options for handle', () => {
      const profileWithoutDisplayName = {
        ...mockProfile,
        displayName: undefined,
      };
      const result = matchesQuery(profileWithoutDisplayName, 'john', {
        handle: false,
        displayName: true,
      });
      expect(result).toBe(false);
    });

    it('should respect query options for displayName', () => {
      const profileWithoutHandle = { ...mockProfile, handle: '' };
      const result = matchesQuery(profileWithoutHandle, 'Doe', {
        handle: true,
        displayName: false,
      });
      expect(result).toBe(false);
    });

    it('should work with partial matches', () => {
      const result = matchesQuery(mockProfile, 'oh');
      expect(result).toBe(true);
    });
  });

  describe('inviteLinkMatchesQuery', () => {
    it('should match by profile handle', () => {
      const result = inviteLinkMatchesQuery(mockInviteLink, 'john');
      expect(result).toBe(true);
    });

    it('should match by profile displayName', () => {
      const result = inviteLinkMatchesQuery(mockInviteLink, 'Doe');
      expect(result).toBe(true);
    });

    it('should match by slug', () => {
      const result = inviteLinkMatchesQuery(mockInviteLink, 'test');
      expect(result).toBe(true);
    });

    it('should match handle with @ prefix', () => {
      const result = inviteLinkMatchesQuery(mockInviteLink, '@johndoe');
      expect(result).toBe(true);
    });

    it('should be case insensitive', () => {
      const result = inviteLinkMatchesQuery(mockInviteLink, 'JOHN');
      expect(result).toBe(true);
    });

    it('should not match when query is not found', () => {
      const result = inviteLinkMatchesQuery(mockInviteLink, 'nonexistent');
      expect(result).toBe(false);
    });

    it('should respect query options for handle', () => {
      const inviteLinkWithoutDisplayName = {
        ...mockInviteLink,
        profile: { ...mockProfile, displayName: undefined },
      } as InviteLinkWithMeta;
      const result = inviteLinkMatchesQuery(
        inviteLinkWithoutDisplayName,
        'john',
        { handle: false, displayName: true, slug: true },
      );
      expect(result).toBe(false);
    });

    it('should respect query options for slug', () => {
      const result = inviteLinkMatchesQuery(mockInviteLink, 'test', {
        handle: true,
        displayName: true,
        slug: false,
      });
      expect(result).toBe(false);
    });

    it('should work with partial matches', () => {
      const result = inviteLinkMatchesQuery(mockInviteLink, 'oh');
      expect(result).toBe(true);
    });

    it('should match by target group name', () => {
      const inviteLinkWithGroup = {
        ...mockInviteLink,
        groups: [
          {
            id: mockGroup.id,
            handle: mockGroup.handle,
            displayName: mockGroup.displayName,
          },
        ],
      } as unknown as InviteLinkWithMeta;
      expect(inviteLinkMatchesQuery(inviteLinkWithGroup, 'Test Group')).toBe(
        true,
      );
      expect(inviteLinkMatchesQuery(inviteLinkWithGroup, 'testgroup')).toBe(
        true,
      );
    });
  });

  describe('sortProfiles', () => {
    it('should sort profiles by name', () => {
      const profiles: PublicProfile[] = [
        { id: 'profile3', displayName: 'Charlie' } as PublicProfile,
        { id: 'profile1', displayName: 'Alice' } as PublicProfile,
        { id: 'profile2', displayName: 'Bob' } as PublicProfile,
      ];
      const result = sortProfiles(profiles);
      expect(result[0].displayName).toBe('Alice');
      expect(result[1].displayName).toBe('Bob');
      expect(result[2].displayName).toBe('Charlie');
    });

    it('should handle profiles with handles instead of displayNames', () => {
      const profiles: PublicProfile[] = [
        { id: 'profile3', handle: 'charlie' } as PublicProfile,
        { id: 'profile1', handle: 'alice' } as PublicProfile,
        { id: 'profile2', handle: 'bob' } as PublicProfile,
      ];
      const result = sortProfiles(profiles);
      expect(result[0].handle).toBe('alice');
      expect(result[1].handle).toBe('bob');
      expect(result[2].handle).toBe('charlie');
    });

    it('should handle empty profiles array', () => {
      const result = sortProfiles([]);
      expect(result).toEqual([]);
    });

    it('should handle profiles with mixed name types', () => {
      const profiles: PublicProfile[] = [
        {
          id: 'profile1',
          displayName: 'Alice',
          handle: 'alice',
        } as PublicProfile,
        { id: 'profile2', handle: 'bob' } as PublicProfile, // No displayName
        { id: 'profile3', displayName: 'Charlie' } as PublicProfile,
      ];
      const result = sortProfiles(profiles);
      expect(result[0].displayName || result[0].handle).toBe('Alice');
      expect(result[1].handle).toBe('bob');
      expect(result[2].displayName).toBe('Charlie');
    });
  });
});
