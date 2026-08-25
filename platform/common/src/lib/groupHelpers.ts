import type {
  GroupData,
  GroupMember,
  GroupRelationship,
  GroupWithMeta,
  ProfileWithMeta,
} from '../types';
import {
  defaultGroupAdminCapabilityAdds,
  defaultGroupOwnerCapabilityAdds,
  defaultGroupRoles,
} from '../types/capabilities';
import {
  checkCapabilities,
  getGroupCapabilitiesByRoles,
} from './capabilitiesHelpers';
import { profileName } from './profileHelpers';

type CapabilitySet = { add?: string[]; remove?: string[] };

const withModerator = (member: CapabilitySet): CapabilitySet => ({
  add: [...(member.add ?? []), 'core-posts-delete'],
  ...(member.remove?.length ? { remove: member.remove } : {}),
});

const ownerCapabilities: CapabilitySet = {
  add: [...defaultGroupOwnerCapabilityAdds],
};

const adminCapabilities: CapabilitySet = {
  add: [...defaultGroupAdminCapabilityAdds],
};

const containsIgnoreCase = (candidate: string, query: string) =>
  candidate.toLowerCase().indexOf(query.toLowerCase()) > -1;

export const groupName = (group?: GroupData) =>
  group?.displayName || group?.handle || '';

export const matchesGroupQuery = (
  group: GroupData,
  query: string,
  queryOptions = { handle: true, displayName: true, description: false },
) =>
  (queryOptions.handle && containsIgnoreCase(group.handle, query)) ||
  (queryOptions.displayName &&
    group.displayName &&
    containsIgnoreCase(group.displayName, query)) ||
  (queryOptions.description &&
    group.description &&
    containsIgnoreCase(group.description, query));

export const sortGroupMembers = (members: GroupMember[]): GroupMember[] =>
  members?.sort((a, b) =>
    (profileName(a.profile) as string).localeCompare(
      profileName(b.profile) as string,
    ),
  ) ?? [];

type RoleList = readonly string[] | null | undefined;

export const groupMembershipHasRole = (roles: RoleList, role: string) =>
  (roles ?? []).includes(role);

export const actorIsGroupOwner = (
  profile: {
    memberships?: { group: { id: string }; roles?: RoleList }[];
  },
  groupId: string,
) =>
  groupMembershipHasRole(
    profile.memberships?.find((m) => m.group.id === groupId)?.roles,
    'owner',
  );

export const countGroupOwners = (members: { roles?: RoleList }[]) =>
  members.filter((m) => groupMembershipHasRole(m.roles, 'owner')).length;

export type GroupRoleChangeBlock = 'last-owner' | 'owner-assignment';

export const groupRoleChangeBlocked = ({
  actorIsOwner,
  currentRoles,
  nextRoles,
  ownerCount,
}: {
  actorIsOwner: boolean;
  currentRoles?: RoleList;
  nextRoles?: RoleList;
  ownerCount: number;
}): GroupRoleChangeBlock | undefined => {
  const wasOwner = groupMembershipHasRole(currentRoles, 'owner');
  const willBeOwner = groupMembershipHasRole(nextRoles, 'owner');
  if (wasOwner !== willBeOwner && !actorIsOwner) {
    return 'owner-assignment';
  }
  if (wasOwner && !willBeOwner && ownerCount <= 1) {
    return 'last-owner';
  }
  return undefined;
};

export const groupOwnerRemovalBlocked = ({
  targetRoles,
  ownerCount,
}: {
  targetRoles?: RoleList;
  ownerCount: number;
}) => groupMembershipHasRole(targetRoles, 'owner') && ownerCount <= 1;

export const assignableGroupRoles = (actorIsOwner: boolean) =>
  actorIsOwner
    ? [...defaultGroupRoles]
    : defaultGroupRoles.filter((role) => role !== 'owner');

export const groupRolesForAssignment = (
  role: (typeof defaultGroupRoles)[number],
): GroupRelationship[] => (role === 'member' ? ['member'] : ['member', role]);

export const canChangeMemberRole = (
  profile: ProfileWithMeta,
  group: GroupWithMeta,
) =>
  checkCapabilities(
    ['core-groups-changeMemberRole'],
    getGroupCapabilitiesByRoles(
      profile.memberships?.find((m) => m.group.id === group.id)?.roles ?? [],
      group,
    ),
  ).success;

export const canAddMember = (profile: ProfileWithMeta, group: GroupWithMeta) =>
  checkCapabilities(
    ['core-groups-addMember'],
    getGroupCapabilitiesByRoles(
      profile.memberships?.find((m) => m.group.id === group.id)?.roles ?? [],
      group,
    ),
  ).success;

export const canRemoveMember = (
  profile: ProfileWithMeta,
  group: GroupWithMeta,
) =>
  checkCapabilities(
    ['core-groups-removeMember'],
    getGroupCapabilitiesByRoles(
      profile.memberships?.find((m) => m.group.id === group.id)?.roles ?? [],
      group,
    ),
  ).success;

export const isGroupDiscoverable = (group: GroupWithMeta) =>
  checkCapabilities(
    ['core-groups-read'],
    getGroupCapabilitiesByRoles(['none'], group),
  ).success;

/** Posts are only readable by explicit group members (not public/local). */
export const hasMemberOnlyPostsVisibility = (
  capabilities: GroupData['capabilities'] | undefined,
) =>
  !capabilities?.none?.add?.includes('core-posts-read') &&
  !capabilities?.local?.add?.includes('core-posts-read');

export const groupCapabilityTemplates = {
  defaultGroup: {
    name: 'defaultGroup',
    capabilities: {
      none: {
        add: ['core-groups-read', 'core-posts-read'],
      },
      local: {
        add: [
          'core-groups-join',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      },
      member: {
        add: [
          'core-groups-join',
          'core-posts-create-*',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
        remove: ['core-posts-create-event'],
      },
      moderator: withModerator({
        add: [
          'core-groups-join',
          'core-posts-create-*',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
        remove: ['core-posts-create-event'],
      }),
      admin: adminCapabilities,
      owner: ownerCapabilities,
    },
  },
  defaultGroupClosedCommunity: {
    name: 'defaultGroupClosedCommunity',
    capabilities: {
      local: {
        add: [
          'core-groups-read',
          'core-posts-read',
          'core-groups-join',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      },
      member: {
        add: [
          'core-groups-read',
          'core-posts-read',
          'core-groups-join',
          'core-posts-create-*',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
        remove: ['core-posts-create-event'],
      },
      moderator: withModerator({
        add: [
          'core-groups-read',
          'core-posts-read',
          'core-groups-join',
          'core-posts-create-*',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
        remove: ['core-posts-create-event'],
      }),
      admin: adminCapabilities,
      owner: ownerCapabilities,
    },
  },
  publicGroup: {
    name: 'publicGroup',
    capabilities: {
      none: {
        add: [
          'core-groups-read',
          'core-groups-join',
          'core-posts-read',
          'core-posts-react',
        ],
      },
      member: {
        add: [
          'core-posts-create-*',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      },
      moderator: withModerator({
        add: [
          'core-posts-create-*',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      }),
      admin: adminCapabilities,
      owner: ownerCapabilities,
    },
  },
  localGroup: {
    name: 'localGroup',
    capabilities: {
      local: {
        add: [
          'core-groups-read',
          'core-groups-join',
          'core-posts-read',
          'core-posts-react',
        ],
      },
      member: {
        add: [
          'core-groups-read',
          'core-groups-join',
          'core-posts-read',
          'core-posts-create-*',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      },
      moderator: withModerator({
        add: [
          'core-groups-read',
          'core-groups-join',
          'core-posts-read',
          'core-posts-create-*',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      }),
      admin: adminCapabilities,
      owner: ownerCapabilities,
    },
  },
  privateGroup: {
    name: 'privateGroup',
    capabilities: {
      member: {
        add: [
          'core-groups-read',
          'core-posts-read',
          'core-posts-create-*',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      },
      moderator: withModerator({
        add: [
          'core-groups-read',
          'core-posts-read',
          'core-posts-create-*',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      }),
      admin: adminCapabilities,
      owner: ownerCapabilities,
    },
  },
  limitedPostingGroup: {
    name: 'limitedPostingGroup',
    capabilities: {
      member: {
        add: [
          'core-groups-read',
          'core-posts-read',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      },
      moderator: withModerator({
        add: [
          'core-groups-read',
          'core-posts-read',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      }),
      admin: adminCapabilities,
      owner: ownerCapabilities,
    },
  },
  announcementGroup: {
    name: 'announcementGroup',
    capabilities: {
      member: {
        add: [
          'core-groups-read',
          'core-posts-read',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      },
      moderator: withModerator({
        add: [
          'core-groups-read',
          'core-posts-read',
          'core-posts-react',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      }),
      admin: adminCapabilities,
      owner: ownerCapabilities,
    },
  },
  lockedGroup: {
    name: 'lockedGroup',
    capabilities: {
      none: {
        add: ['core-groups-read', 'core-posts-read', 'core-posts-react'],
      },
      member: {
        add: ['core-posts-reply', 'core-posts-rsvp', 'core-posts-vote'],
      },
      moderator: withModerator({
        add: ['core-posts-reply', 'core-posts-rsvp', 'core-posts-vote'],
      }),
      admin: adminCapabilities,
      owner: ownerCapabilities,
    },
  },
};
