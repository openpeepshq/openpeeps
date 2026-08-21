import { checkCapabilities } from '@openpeepshq/common/lib';
import type { GroupData, GroupRelationship } from '@openpeepshq/common/types';

type GroupCapabilities = GroupData['capabilities'];

const CREATE_LEAVES = [
  'core-posts-create-note',
  'core-posts-create-event',
  'core-posts-create-poll',
  'core-posts-create-article',
] as const;

const relationshipCaps = (
  capabilities: GroupCapabilities | undefined,
  relationship: GroupRelationship,
) => capabilities?.[relationship] ?? {};

/** Effective grant for a relationship, including wildcards and remove. */
export const relationshipAllows = (
  capabilities: GroupCapabilities | undefined,
  relationship: GroupRelationship,
  cap: string,
) =>
  checkCapabilities([cap], relationshipCaps(capabilities, relationship))
    .success;

const addCapabilities = (
  capabilitiesToAdd: string[],
  capabilities: string[] = [],
) => [...new Set([...capabilities, ...capabilitiesToAdd])];

const removeCapabilities = (
  capabilitiesToRemove: string[],
  capabilities: string[] = [],
) => capabilities.filter((c) => !capabilitiesToRemove.includes(c));

const patchRelationship = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  patch: { add?: string[]; remove?: string[] },
): GroupCapabilities => {
  const current = relationshipCaps(capabilities, relationship);
  return {
    ...capabilities,
    [relationship]: {
      ...current,
      ...(patch.add !== undefined ? { add: patch.add } : {}),
      ...(patch.remove !== undefined ? { remove: patch.remove } : {}),
    },
  };
};

export function getGroupVisibilityValue(
  capabilities: GroupCapabilities | undefined,
) {
  if (relationshipAllows(capabilities, 'none', 'core-groups-read')) {
    return 'public';
  }
  if (relationshipAllows(capabilities, 'local', 'core-groups-read')) {
    return 'local';
  }
  return 'private';
}

export function getGroupPostsVisibilityValue(
  capabilities: GroupCapabilities | undefined,
) {
  if (relationshipAllows(capabilities, 'none', 'core-posts-read')) {
    return 'public';
  }
  if (relationshipAllows(capabilities, 'local', 'core-posts-read')) {
    return 'local';
  }
  return 'private';
}

export function getGroupWhoCanJoinValue(
  capabilities: GroupCapabilities | undefined,
) {
  return relationshipAllows(capabilities, 'local', 'core-groups-join')
    ? 'open'
    : 'closed';
}

export function getGroupWhoCanPostValue(
  capabilities: GroupCapabilities | undefined,
) {
  // Any create leaf (or covering wildcard) means members can post.
  return relationshipAllows(capabilities, 'member', 'core-posts-create-note')
    ? 'members'
    : 'admin';
}

export function getGroupWhoCanPostEventsValue(
  capabilities: GroupCapabilities | undefined,
) {
  return relationshipAllows(capabilities, 'member', 'core-posts-create-event')
    ? 'members'
    : 'admin';
}

export function setGroupVisibility(
  groupData: { capabilities: GroupCapabilities },
  value: string,
) {
  let capabilities = groupData.capabilities;
  for (const relationship of ['none', 'local', 'member'] as const) {
    const shouldHave =
      (value === 'public' && relationship === 'none') ||
      (value === 'local' && relationship === 'local') ||
      (value === 'private' && relationship === 'member');
    const add = relationshipCaps(capabilities, relationship).add ?? [];
    capabilities = patchRelationship(capabilities, relationship, {
      add: shouldHave
        ? addCapabilities(['core-groups-read'], add)
        : removeCapabilities(['core-groups-read'], add),
    });
  }
  groupData.capabilities = capabilities;

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
  let capabilities = groupData.capabilities;
  for (const relationship of ['none', 'local', 'member'] as const) {
    const shouldHave =
      (value === 'public' && relationship === 'none') ||
      (value === 'local' && relationship === 'local') ||
      (value === 'private' && relationship === 'member');
    const add = relationshipCaps(capabilities, relationship).add ?? [];
    capabilities = patchRelationship(capabilities, relationship, {
      add: shouldHave
        ? addCapabilities(['core-posts-read'], add)
        : removeCapabilities(['core-posts-read'], add),
    });
  }
  groupData.capabilities = capabilities;
}

export function setGroupWhoCanJoin(
  groupData: { capabilities: GroupCapabilities },
  value: string,
) {
  const add = relationshipCaps(groupData.capabilities, 'local').add ?? [];
  groupData.capabilities = patchRelationship(groupData.capabilities, 'local', {
    add:
      value === 'open'
        ? addCapabilities(['core-groups-join'], add)
        : removeCapabilities(['core-groups-join'], add),
  });
}

export function setGroupWhoCanPost(
  groupData: { capabilities: GroupCapabilities },
  value: string,
) {
  const current = relationshipCaps(groupData.capabilities, 'member');
  const add = current.add ?? [];
  if (value === 'members') {
    groupData.capabilities = patchRelationship(
      groupData.capabilities,
      'member',
      {
        add: addCapabilities(['core-posts-create-*'], add),
      },
    );
    return;
  }

  // Admin-only posting: drop create wildcards/leaves and clear event remove.
  groupData.capabilities = patchRelationship(groupData.capabilities, 'member', {
    add: removeCapabilities(
      ['core-posts-create-*', ...CREATE_LEAVES],
      add,
    ),
    remove: removeCapabilities(
      ['core-posts-create-event'],
      current.remove ?? [],
    ),
  });
}

export function setGroupWhoCanPostEvents(
  groupData: { capabilities: GroupCapabilities },
  value: string,
) {
  const current = relationshipCaps(groupData.capabilities, 'member');
  groupData.capabilities = patchRelationship(groupData.capabilities, 'member', {
    add: current.add,
    remove:
      value === 'admin'
        ? addCapabilities(['core-posts-create-event'], current.remove ?? [])
        : removeCapabilities(['core-posts-create-event'], current.remove ?? []),
  });
}

export function postsVisibilityOptionsForGroup(
  visibilityValue: string,
): string[] {
  if (visibilityValue === 'private') return ['private'];
  if (visibilityValue === 'local') return ['local', 'private'];
  return ['public', 'local', 'private'];
}
