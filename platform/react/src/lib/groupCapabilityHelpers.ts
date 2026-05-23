import type { GroupData } from '@openpeeps/common/types';

type GroupCapabilities = GroupData['capabilities'];

const addCapabilities = (
  capabilitiesToAdd: string[],
  capabilities: string[] = [],
) => [...capabilities, ...capabilitiesToAdd];

const removeCapabilities = (
  capabilitiesToRemove: string[],
  capabilities: string[] = [],
) => capabilities.filter((c) => !capabilitiesToRemove.includes(c));

export function getGroupVisibilityValue(
  capabilities: GroupCapabilities | undefined,
) {
  if (capabilities?.none?.add?.includes('core-groups-read')) return 'public';
  if (capabilities?.local?.add?.includes('core-groups-read')) return 'local';
  return 'private';
}

export function getGroupPostsVisibilityValue(
  capabilities: GroupCapabilities | undefined,
) {
  if (capabilities?.none?.add?.includes('core-posts-read')) return 'public';
  if (capabilities?.local?.add?.includes('core-posts-read')) return 'local';
  return 'private';
}

export function getGroupWhoCanJoinValue(
  capabilities: GroupCapabilities | undefined,
) {
  return capabilities?.local?.add?.includes('core-groups-join') ? 'open' : 'closed';
}

export function getGroupWhoCanPostValue(
  capabilities: GroupCapabilities | undefined,
) {
  return capabilities?.member?.add?.includes('core-posts-create-*')
    ? 'members'
    : 'moderators';
}

export function getGroupWhoCanPostEventsValue(
  capabilities: GroupCapabilities | undefined,
) {
  return capabilities?.member?.remove?.includes('core-posts-create-event')
    ? 'moderators'
    : 'members';
}

export function setGroupVisibility(
  groupData: { capabilities: GroupCapabilities },
  value: string,
) {
  const capabilities = groupData.capabilities;
  groupData.capabilities = {
    ...capabilities,
    none: {
      add:
        value === 'public'
          ? addCapabilities(['core-groups-read'], capabilities.none?.add)
          : removeCapabilities(['core-groups-read'], capabilities.none?.add),
    },
    local: {
      add:
        value === 'local'
          ? addCapabilities(['core-groups-read'], capabilities.local?.add)
          : removeCapabilities(['core-groups-read'], capabilities.local?.add),
    },
    member: {
      add:
        value === 'private'
          ? addCapabilities(['core-groups-read'], capabilities.member?.add)
          : removeCapabilities(['core-groups-read'], capabilities.member?.add),
    },
  };

  const postsVisibility = getGroupPostsVisibilityValue(groupData.capabilities);
  if (value === 'local' && postsVisibility === 'public') {
    setGroupPostsVisibility(groupData, 'local');
  } else if (value === 'private') {
    setGroupPostsVisibility(groupData, 'private');
  }
}

export function setGroupPostsVisibility(
  groupData: { capabilities: GroupCapabilities },
  value: string,
) {
  const capabilities = groupData.capabilities;
  groupData.capabilities = {
    ...capabilities,
    none: {
      add:
        value === 'public'
          ? addCapabilities(['core-posts-read'], capabilities.none?.add)
          : removeCapabilities(['core-posts-read'], capabilities.none?.add),
    },
    local: {
      add:
        value === 'local'
          ? addCapabilities(['core-posts-read'], capabilities.local?.add)
          : removeCapabilities(['core-posts-read'], capabilities.local?.add),
    },
    member: {
      add:
        value === 'private'
          ? addCapabilities(['core-posts-read'], capabilities.member?.add)
          : removeCapabilities(['core-posts-read'], capabilities.member?.add),
    },
  };
}

export function setGroupWhoCanJoin(
  groupData: { capabilities: GroupCapabilities },
  value: string,
) {
  const capabilities = groupData.capabilities;
  groupData.capabilities = {
    ...capabilities,
    local: {
      add:
        value === 'open'
          ? addCapabilities(['core-groups-join'], capabilities.local?.add)
          : removeCapabilities(['core-groups-join'], capabilities.local?.add),
    },
  };
}

export function setGroupWhoCanPost(
  groupData: { capabilities: GroupCapabilities },
  value: string,
) {
  const capabilities = groupData.capabilities;
  groupData.capabilities = {
    ...capabilities,
    member: {
      add:
        value === 'members'
          ? addCapabilities(['core-posts-create-*'], capabilities.member?.add)
          : removeCapabilities(['core-posts-create-*'], capabilities.member?.add),
    },
  };
}

export function setGroupWhoCanPostEvents(
  groupData: { capabilities: GroupCapabilities },
  value: string,
) {
  const capabilities = groupData.capabilities;
  groupData.capabilities = {
    ...capabilities,
    member: {
      add: capabilities.member?.add,
      remove:
        value === 'moderators'
          ? addCapabilities(
              ['core-posts-create-event'],
              capabilities.member?.remove,
            )
          : removeCapabilities(
              ['core-posts-create-event'],
              capabilities.member?.remove,
            ),
    },
  };
}

export function postsVisibilityOptionsForGroup(
  visibilityValue: string,
): string[] {
  if (visibilityValue === 'private') return ['private'];
  if (visibilityValue === 'local') return ['local', 'private'];
  return ['public', 'local', 'private'];
}
