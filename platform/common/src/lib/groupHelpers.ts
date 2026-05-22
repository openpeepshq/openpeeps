import type { GroupData, GroupMember, GroupWithMeta, ProfileWithMeta } from '../types';
import {
  checkCapabilities,
  getGroupCapabilitiesByRoles,
} from './capabilitiesHelpers';
import { profileName } from './profileHelpers';

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

export const canChangeMemberRole = (
  profile: ProfileWithMeta,
  group: GroupWithMeta,
) =>
  checkCapabilities(
    ['core-groups-changeMemberRole'],
    getGroupCapabilitiesByRoles(profile.memberships?.find((m) => m.group.id === group.id)?.roles ?? [], group),
  ).success;

export const canAddMember = (profile: ProfileWithMeta, group: GroupWithMeta) =>
  checkCapabilities(
    ['core-groups-addMember'],
    getGroupCapabilitiesByRoles(profile.memberships?.find((m) => m.group.id === group.id)?.roles ?? [], group),
  ).success;

export const canRemoveMember = (profile: ProfileWithMeta, group: GroupWithMeta) =>
  checkCapabilities(
    ['core-groups-removeMember'],
    getGroupCapabilitiesByRoles(profile.memberships?.find((m) => m.group.id === group.id)?.roles ?? [], group),
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
        add: [
          'core-groups-read',
          'core-posts-read',
        ],
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
          'core-posts-create-*',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
        remove: ['core-posts-create-event'],
      },
      moderator: {
        add: ['core-posts-*'],
      },
      admin: {
        add: ['core-posts-*', 'core-groups-*'],
      },
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
          'core-posts-create-*',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
        remove: ['core-posts-create-event'],
      },
      moderator: {
        add: ['core-posts-*'],
      },
      admin: {
        add: ['core-posts-*', 'core-groups-*'],
      },
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
      moderator: {
        add: ['core-posts-*'],
      },
      admin: {
        add: ['core-posts-*', 'core-groups-*'],
      },
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
          'core-posts-create-*',
          'core-posts-reply',
          'core-posts-rsvp',
          'core-posts-vote',
        ],
      },
      moderator: {
        add: ['core-posts-*'],
      },
      admin: {
        add: ['core-posts-*', 'core-groups-*'],
      },
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
      moderator: {
        add: ['core-posts-*'],
      },
      admin: {
        add: ['core-posts-*', 'core-groups-*'],
      },
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
      moderator: {
        add: ['core-posts-*'],
      },
      admin: {
        add: ['core-posts-*', 'core-groups-*'],
      },
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
      moderator: {
        add: ['core-posts-*'],
      },
      admin: {
        add: ['core-posts-*', 'core-groups-*'],
      },
    },
  },
};
