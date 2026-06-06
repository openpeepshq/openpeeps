import { describe, it, expect } from 'vitest';
import {
  profileName,
  matchesQuery,
  inviteLinkMatchesQuery,
  sortProfiles,
} from '../profileHelpers';
import type {
  PublicProfile,
  GroupWithMeta,
  InviteLinkWithMeta,
} from '../../types';

// Mock data for testing
const mockProfile: PublicProfile = {
  id: 'profile1',
  displayName: 'John Doe',
  handle: 'johndoe',
} as PublicProfile;

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
          { id: mockGroup.id, handle: mockGroup.handle, displayName: mockGroup.displayName },
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
