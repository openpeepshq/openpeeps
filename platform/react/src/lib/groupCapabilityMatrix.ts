import { checkCapabilities } from '@openpeepshq/common/lib';
import {
  groupCapabilityEditorKeys,
  type GroupRelationship,
} from '@openpeepshq/common/types';
import type { GroupData } from '@openpeepshq/common/types';

export type CapabilityEditorGroup = {
  /** Prefix including trailing hyphen, e.g. `core-groups-`. */
  prefix: string;
  /** Wildcard capability for “allow all”, e.g. `core-groups-*`. */
  wildcard: string;
  leaves: string[];
};

type GroupCapabilities = GroupData['capabilities'];

const editorKeys = [...groupCapabilityEditorKeys];

const wildcardPrefix = (wildcard: string) => wildcard.replace(/\*$/, '');

/** Split editor keys into prefix groups with an optional `…-*` allow-all. */
export const groupCapabilityEditorGroups = (): CapabilityEditorGroup[] => {
  const wildcards = editorKeys
    .filter((key) => key.endsWith('*'))
    .sort((a, b) => b.length - a.length);
  const leaves = editorKeys.filter((key) => !key.includes('*'));

  const groups: CapabilityEditorGroup[] = wildcards.map((wildcard) => ({
    prefix: wildcardPrefix(wildcard),
    wildcard,
    leaves: [],
  }));

  for (const leaf of leaves) {
    const group = groups.find((candidate) => leaf.startsWith(candidate.prefix));
    if (group) {
      group.leaves.push(leaf);
    }
  }

  return groups
    .filter((group) => group.leaves.length > 0 || group.wildcard)
    .sort((a, b) => a.prefix.localeCompare(b.prefix));
};

export const relationshipAdds = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
) => capabilities?.[relationship]?.add ?? [];

export const relationshipRemoves = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
) => capabilities?.[relationship]?.remove ?? [];

export const hasExplicitCap = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
) => relationshipAdds(capabilities, relationship).includes(cap);

export const hasExplicitRemove = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
) => relationshipRemoves(capabilities, relationship).includes(cap);

/** True when an add-list wildcard covers `cap` (same rule as checkCapabilities). */
export const isCoveredByWildcard = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
) =>
  relationshipAdds(capabilities, relationship).some(
    (granted) =>
      granted.includes('*') && cap.startsWith(granted.split('*')[0] ?? ''),
  );

/** Effective grant after wildcards and remove (matches runtime checks). */
export const isEffectivelyGranted = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
) =>
  checkCapabilities([cap], capabilities?.[relationship] ?? {}).success;

export const setRelationshipAdds = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  add: string[],
): GroupCapabilities => ({
  ...capabilities,
  [relationship]: {
    ...capabilities?.[relationship],
    add,
  },
});

export const setRelationshipRemoves = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  remove: string[],
): GroupCapabilities => ({
  ...capabilities,
  [relationship]: {
    ...capabilities?.[relationship],
    remove,
  },
});

/**
 * Toggle a capability for a relationship, preserving sync with simple mode.
 * Covered leaves are excluded/re-included via `remove` instead of disabling.
 */
export const toggleRelationshipCapability = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
): GroupCapabilities => {
  const add = relationshipAdds(capabilities, relationship);
  const remove = relationshipRemoves(capabilities, relationship);
  const granted = isEffectivelyGranted(capabilities, relationship, cap);
  const covered = isCoveredByWildcard(capabilities, relationship, cap);
  const explicit = hasExplicitCap(capabilities, relationship, cap);

  if (granted) {
    if (covered && !explicit) {
      return setRelationshipRemoves(capabilities, relationship, [
        ...remove,
        cap,
      ]);
    }
    let nextAdd = add.filter((item) => item !== cap);
    let nextRemove = remove;
    if (cap.endsWith('*')) {
      const prefix = wildcardPrefix(cap);
      nextRemove = remove.filter((item) => !item.startsWith(prefix));
    }
    return {
      ...capabilities,
      [relationship]: {
        ...capabilities?.[relationship],
        add: nextAdd,
        remove: nextRemove,
      },
    };
  }

  if (hasExplicitRemove(capabilities, relationship, cap)) {
    return setRelationshipRemoves(
      capabilities,
      relationship,
      remove.filter((item) => item !== cap),
    );
  }

  let nextAdd = [...add, cap];
  let nextRemove = remove;
  if (cap.endsWith('*')) {
    const prefix = wildcardPrefix(cap);
    nextRemove = remove.filter((item) => !item.startsWith(prefix));
  }
  return {
    ...capabilities,
    [relationship]: {
      ...capabilities?.[relationship],
      add: nextAdd,
      remove: nextRemove,
    },
  };
};
