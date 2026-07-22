import { describe, it, expect } from 'vitest';
import {
    groupName,
    matchesGroupQuery,
    sortGroupMembers,
    canChangeMemberRole,
    canAddMember,
    canRemoveMember,
    isGroupDiscoverable,
    groupCapabilityTemplates,
    hasMemberOnlyPostsVisibility,
} from '../groupHelpers';
import type {
    GroupData,
    GroupMember,
    GroupWithMeta,
    ProfileWithMeta,
} from '../../types';
import { groupRoleSchema } from '../../types/models';
import { groupRelationships } from '../../types/capabilities';

// Mock data for testing
const mockGroupData: GroupData = {
    handle: 'test-group',
    displayName: 'Test Group',
    description: 'A test group for testing purposes',
    capabilities: {
        member: {
            add: [
                'core-groups-changeMemberRole',
                'core-groups-addMember',
                'core-groups-removeMember',
            ],
            remove: [],
        },
        none: {
            add: ['core-groups-read'],
            remove: [],
        },
    },
} as GroupData;

const mockGroupWithMeta: GroupWithMeta = {
    ...mockGroupData,
    id: 'group1',
    membersCount: 0,
    createdAt: '2021-01-01',
    updatedAt: '2021-01-01',
    deletedAt: null,
} as GroupWithMeta;

const mockProfile: ProfileWithMeta = {
    id: 'profile1',
    displayName: 'John Doe',
    handle: 'johndoe',
    memberships: [
        {
            group: mockGroupWithMeta,
            roles: ['member'],
        },
    ],
} as ProfileWithMeta;

const mockGroupMember: GroupMember = {
    id: 'member1',
    profile: mockProfile,
    roles: ['member'],
} as GroupMember;

describe('groupHelpers', () => {
    describe('groupName', () => {
        it('should return displayName when available', () => {
            const result = groupName(mockGroupData);
            expect(result).toBe('Test Group');
        });

        it('should return handle when displayName is not available', () => {
            const groupWithoutDisplayName = {
                ...mockGroupData,
                displayName: undefined,
            };
            const result = groupName(groupWithoutDisplayName);
            expect(result).toBe('test-group');
        });

        it('should return empty string for undefined group', () => {
            const result = groupName(undefined);
            expect(result).toBe('');
        });
    });

    describe('matchesGroupQuery', () => {
        it('should match by handle', () => {
            const result = matchesGroupQuery(mockGroupData, 'test');
            expect(result).toBe(true);
        });

        it('should match by displayName', () => {
            const result = matchesGroupQuery(mockGroupData, 'Group');
            expect(result).toBe(true);
        });

        it('should match by description when enabled', () => {
            const result = matchesGroupQuery(mockGroupData, 'testing', {
                handle: false,
                displayName: false,
                description: true,
            });
            expect(result).toBe(true);
        });

        it('should be case insensitive', () => {
            const result = matchesGroupQuery(mockGroupData, 'TEST');
            expect(result).toBe(true);
        });

        it('should not match when query is not found', () => {
            const result = matchesGroupQuery(mockGroupData, 'nonexistent');
            expect(result).toBe(false);
        });

        it('should not match description when disabled', () => {
            const result = matchesGroupQuery(mockGroupData, 'testing', {
                handle: false,
                displayName: false,
                description: false,
            });
            expect(result).toBe(false);
        });

        it('should work with partial matches', () => {
            const result = matchesGroupQuery(mockGroupData, 'est');
            expect(result).toBe(true);
        });
    });

    describe('sortGroupMembers', () => {
        it('should sort members by profile name', () => {
            const members: GroupMember[] = [
                {
                    profile: { id: 'profile1', displayName: 'Charlie' } as ProfileWithMeta,
                    roles: [],
                },
                {
                    profile: { id: 'profile2', displayName: 'Alice' } as ProfileWithMeta,
                    roles: [],
                },
                {
                    profile: { id: 'profile3', displayName: 'Bob' } as ProfileWithMeta,
                    roles: [],
                },
            ];
            const result = sortGroupMembers(members);
            expect(result[0].profile.displayName).toBe('Alice');
            expect(result[1].profile.displayName).toBe('Bob');
            expect(result[2].profile.displayName).toBe('Charlie');
        });

        it('should handle empty members array', () => {
            const result = sortGroupMembers([]);
            expect(result).toEqual([]);
        });

    });

    describe('canChangeMemberRole', () => {
        it('should return true when member has capability', () => {
            const result = canChangeMemberRole(mockGroupMember.profile, mockGroupWithMeta);
            expect(result).toBe(true);
        });

        it('should return false when member lacks capability', () => {
            const groupWithoutCapability = {
                ...mockGroupWithMeta,
                capabilities: {
                    member: { add: [], remove: [] },
                },
            };
            const result = canChangeMemberRole(
                mockGroupMember.profile,
                groupWithoutCapability,
            );
            expect(result).toBe(false);
        });
    });

    describe('canAddMember', () => {
        it('should return true when member has capability', () => {
            const result = canAddMember(mockGroupMember.profile, mockGroupWithMeta);
            expect(result).toBe(true);
        });

        it('should return false when member lacks capability', () => {
            const groupWithoutCapability = {
                ...mockGroupWithMeta,
                capabilities: {
                    member: { add: [], remove: [] },
                },
            };
            const result = canAddMember(mockGroupMember.profile, groupWithoutCapability);
            expect(result).toBe(false);
        });
    });

    describe('canRemoveMember', () => {
        it('should return true when member has capability', () => {
            const result = canRemoveMember(mockGroupMember.profile, mockGroupWithMeta);
            expect(result).toBe(true);
        });

        it('should return false when member lacks capability', () => {
            const groupWithoutCapability = {
                ...mockGroupWithMeta,
                capabilities: {
                    member: { add: [], remove: [] },
                },
            };
            const result = canRemoveMember(mockGroupMember.profile, groupWithoutCapability);
            expect(result).toBe(false);
        });
    });

    describe('isGroupDiscoverable', () => {
        it('should return true when group is discoverable', () => {
            const result = isGroupDiscoverable(mockGroupWithMeta);
            expect(result).toBe(true);
        });

        it('should return false when group is not discoverable', () => {
            const nonDiscoverableGroup = {
                ...mockGroupWithMeta,
                capabilities: {
                    none: { add: [], remove: [] },
                },
            };
            const result = isGroupDiscoverable(nonDiscoverableGroup);
            expect(result).toBe(false);
        });
    });

    describe('hasMemberOnlyPostsVisibility', () => {
        it('returns true when only members can read posts', () => {
            expect(
                hasMemberOnlyPostsVisibility(groupCapabilityTemplates.privateGroup.capabilities),
            ).toBe(true);
        });

        it('returns false when locals can read posts', () => {
            expect(
                hasMemberOnlyPostsVisibility(groupCapabilityTemplates.defaultGroup.capabilities),
            ).toBe(false);
        });
    });

    describe('groupCapabilityTemplates', () => {
        it('should have all expected templates', () => {
            expect(groupCapabilityTemplates.defaultGroup).toBeDefined();
            expect(groupCapabilityTemplates.publicGroup).toBeDefined();
            expect(groupCapabilityTemplates.localGroup).toBeDefined();
            expect(groupCapabilityTemplates.privateGroup).toBeDefined();
            expect(groupCapabilityTemplates.limitedPostingGroup).toBeDefined();
            expect(groupCapabilityTemplates.lockedGroup).toBeDefined();
        });

        it('should have correct structure for defaultGroup', () => {
            const template = groupCapabilityTemplates.defaultGroup;
            expect(template.name).toBe('defaultGroup');
            expect(template.capabilities.none).toBeDefined();
            expect(template.capabilities.member).toBeDefined();
            expect(template.capabilities.moderator).toBeDefined();
            expect(template.capabilities.admin).toBeDefined();
        });

        it('should have correct structure for publicGroup', () => {
            const template = groupCapabilityTemplates.publicGroup;
            expect(template.name).toBe('publicGroup');
            expect(template.capabilities.none).toBeDefined();
            expect(template.capabilities.member).toBeDefined();
            expect(template.capabilities.moderator).toBeDefined();
            expect(template.capabilities.admin).toBeDefined();
        });

        it('should have correct structure for localGroup', () => {
            const template = groupCapabilityTemplates.localGroup;
            expect(template.name).toBe('localGroup');
            expect(template.capabilities.local).toBeDefined();
            expect(template.capabilities.member).toBeDefined();
            expect(template.capabilities.moderator).toBeDefined();
            expect(template.capabilities.admin).toBeDefined();
        });

        it('should grant vote capability to privateGroup members', () => {
            const memberAdd = groupCapabilityTemplates.privateGroup.capabilities.member?.add ?? [];
            expect(memberAdd).toContain('core-posts-vote');
            expect(memberAdd).toContain('core-posts-read');
        });

        it('should grant vote capability to defaultGroup local profiles', () => {
            const localAdd = groupCapabilityTemplates.defaultGroup.capabilities.local?.add ?? [];
            expect(localAdd).toContain('core-posts-vote');
        });

        it('should grant vote capability to defaultGroupClosedCommunity local profiles', () => {
            const localAdd =
                groupCapabilityTemplates.defaultGroupClosedCommunity.capabilities.local?.add ?? [];
            expect(localAdd).toContain('core-posts-vote');
        });

        it('should grant moderators member management without group settings', () => {
            const templates = Object.values(groupCapabilityTemplates);
            for (const template of templates) {
                const moderatorAdd = template.capabilities.moderator?.add ?? [];
                expect(moderatorAdd).toContain('core-posts-*');
                expect(moderatorAdd).toContain('core-groups-addMember');
                expect(moderatorAdd).toContain('core-groups-removeMember');
                expect(moderatorAdd).not.toContain('core-groups-*');
                expect(moderatorAdd).not.toContain('core-groups-update');

                const adminAdd = template.capabilities.admin?.add ?? [];
                expect(adminAdd).toContain('core-groups-*');
            }
        });

        it('should have correct structure for privateGroup', () => {
            const template = groupCapabilityTemplates.privateGroup;
            expect(template.name).toBe('privateGroup');
            expect(template.capabilities.member).toBeDefined();
            expect(template.capabilities.moderator).toBeDefined();
            expect(template.capabilities.admin).toBeDefined();
        });

        it('should have correct structure for limitedPostingGroup', () => {
            const template = groupCapabilityTemplates.limitedPostingGroup;
            expect(template.name).toBe('limitedPostingGroup');
            expect(template.capabilities.member).toBeDefined();
            expect(template.capabilities.moderator).toBeDefined();
            expect(template.capabilities.admin).toBeDefined();
        });

        it('should have correct structure for lockedGroup', () => {
            const template = groupCapabilityTemplates.lockedGroup;
            expect(template.name).toBe('lockedGroup');
            expect(template.capabilities.none).toBeDefined();
            expect(template.capabilities.member).toBeDefined();
            expect(template.capabilities.moderator).toBeDefined();
            expect(template.capabilities.admin).toBeDefined();
        });
    });

    describe('group membership roles', () => {
        it('should allow moderator in groupRelationships and groupRoleSchema', () => {
            expect(groupRelationships).toContain('moderator');
            expect(
                groupRoleSchema.safeParse({ roles: ['member', 'moderator'] }).success,
            ).toBe(true);
        });
    });
});
