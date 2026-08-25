import { checkCapabilities } from '@openpeepshq/common/lib';
import {
  groupCapabilityEditorKeys,
  groupCapabilityEditorRelationships,
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

export type CapabilityCellState =
  | 'none'
  | 'implicit-remove'
  | 'implicit-add'
  | 'specific-add'
  | 'specific-remove';

type GroupCapabilities = GroupData['capabilities'];

const editorKeys = [...groupCapabilityEditorKeys];
const editorRelationships = [...groupCapabilityEditorRelationships];

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

const isMatchedByWildcard = (cap: string, granted: string) =>
  granted.includes('*') && cap.startsWith(granted.split('*')[0] ?? '');

/** True when an add-list wildcard covers `cap` (same rule as checkCapabilities). */
export const isCoveredByWildcard = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
) =>
  relationshipAdds(capabilities, relationship).some((granted) =>
    isMatchedByWildcard(cap, granted),
  );

/** True when a remove-list wildcard covers `cap`. */
export const isCoveredByWildcardRemove = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
) =>
  relationshipRemoves(capabilities, relationship).some((denied) =>
    isMatchedByWildcard(cap, denied),
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

/** Effective grant from the `none` bucket alone (everyone merges this relationship). */
export const isGrantedByNone = (
  capabilities: GroupCapabilities,
  cap: string,
) =>
  isEffectivelyGranted(
    { none: capabilities?.none ?? {} },
    'none',
    cap,
  );

const implicitAddFromNone = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
) => {
  if (relationship === 'none') {
    return false;
  }
  if (!isGrantedByNone(capabilities, cap)) {
    return false;
  }
  if (hasExplicitCap(capabilities, relationship, cap)) {
    return false;
  }
  if (isCoveredByWildcard(capabilities, relationship, cap)) {
    return false;
  }
  return true;
};

const implicitRemoveFromNone = (
  capabilities: GroupCapabilities,
  cap: string,
) => isCoveredByWildcardRemove(capabilities, 'none', cap);

export const getCapabilityCellState = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
): CapabilityCellState => {
  const explicitAdd = hasExplicitCap(capabilities, relationship, cap);
  const explicitRemove = hasExplicitRemove(capabilities, relationship, cap);
  const implicitAddHere =
    isCoveredByWildcard(capabilities, relationship, cap) && !explicitAdd;
  const implicitAddFromEveryone =
    implicitAddFromNone(capabilities, relationship, cap);

  if (
    relationship !== 'none' &&
    implicitRemoveFromNone(capabilities, cap)
  ) {
    return 'implicit-remove';
  }
  if (explicitRemove) {
    return 'specific-remove';
  }
  if (isCoveredByWildcardRemove(capabilities, relationship, cap)) {
    return 'implicit-remove';
  }
  if (explicitAdd) {
    if (implicitAddFromEveryone) {
      return 'implicit-add';
    }
    return 'specific-add';
  }
  if (implicitAddHere || implicitAddFromEveryone) {
    return 'implicit-add';
  }
  return 'none';
};

const patchRelationship = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  add: string[],
  remove: string[],
): GroupCapabilities => ({
  ...capabilities,
  [relationship]: {
    ...capabilities?.[relationship],
    add,
    remove,
  },
});

const stripPrefixFromRemove = (remove: string[], prefix: string) =>
  remove.filter((item) => !item.startsWith(prefix));

/** Drop redundant explicit entries after wildcard add/remove changes. */
export const normalizeRelationshipCapabilities = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
): GroupCapabilities => {
  let add = [...relationshipAdds(capabilities, relationship)];
  let remove = [...relationshipRemoves(capabilities, relationship)];

  const snapshot = () =>
    patchRelationship(capabilities, relationship, add, remove);

  for (const cap of editorKeys) {
    const caps = snapshot();
    if (relationship !== 'none' && isGrantedByNone(caps, cap)) {
      add = add.filter((item) => item !== cap);
    }
    if (relationship !== 'none' && implicitRemoveFromNone(caps, cap)) {
      add = add.filter((item) => item !== cap);
      if (!cap.endsWith('*') && remove.includes(cap)) {
        remove = remove.filter((item) => item !== cap);
      }
    }
    if (isCoveredByWildcardRemove(caps, relationship, cap)) {
      add = add.filter((item) => item !== cap);
    }
    if (
      isCoveredByWildcard(caps, relationship, cap) &&
      add.includes(cap) &&
      !cap.endsWith('*')
    ) {
      add = add.filter((item) => item !== cap);
    }
    if (
      isCoveredByWildcardRemove(caps, relationship, cap) &&
      remove.includes(cap) &&
      !cap.endsWith('*')
    ) {
      remove = remove.filter((item) => item !== cap);
    }
  }

  for (const entry of add) {
    if (!entry.endsWith('*')) continue;
    const prefix = wildcardPrefix(entry);
    add = add.filter(
      (item) =>
        item === entry || item.endsWith('*') || !item.startsWith(prefix),
    );
  }

  for (const entry of remove) {
    if (!entry.endsWith('*')) continue;
    const prefix = wildcardPrefix(entry);
    remove = remove.filter(
      (item) =>
        item === entry || item.endsWith('*') || !item.startsWith(prefix),
    );
    add = add.filter((item) => !isMatchedByWildcard(item, entry));
  }

  return patchRelationship(capabilities, relationship, add, remove);
};

export const normalizeGroupCapabilities = (
  capabilities: GroupCapabilities,
): GroupCapabilities => {
  let next = capabilities;
  for (const relationship of editorRelationships) {
    next = normalizeRelationshipCapabilities(next, relationship);
  }
  return next;
};

export const cycleCapabilityCell = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
): GroupCapabilities => {
  const state = getCapabilityCellState(capabilities, relationship, cap);
  if (state === 'implicit-remove') {
    return capabilities;
  }

  const add = relationshipAdds(capabilities, relationship);
  const remove = relationshipRemoves(capabilities, relationship);
  const prefix = cap.endsWith('*') ? wildcardPrefix(cap) : undefined;

  let next: GroupCapabilities;

  switch (state) {
    case 'implicit-add':
      next = setRelationshipRemoves(capabilities, relationship, [...remove, cap]);
      break;
    case 'specific-remove':
      const implicitGrant =
        (isCoveredByWildcard(capabilities, relationship, cap) &&
          !hasExplicitCap(capabilities, relationship, cap)) ||
        implicitAddFromNone(capabilities, relationship, cap);
      next = setRelationshipRemoves(
        capabilities,
        relationship,
        remove.filter((item) => item !== cap),
      );
      if (!implicitGrant && prefix) {
        next = setRelationshipRemoves(
          next,
          relationship,
          stripPrefixFromRemove(
            relationshipRemoves(next, relationship),
            prefix,
          ),
        );
      }
      break;
    case 'specific-add':
      next = patchRelationship(
        capabilities,
        relationship,
        add.filter((item) => item !== cap),
        [...remove, cap],
      );
      break;
    case 'none':
      next = patchRelationship(
        capabilities,
        relationship,
        [...add, cap],
        remove,
      );
      break;
    default:
      next = capabilities;
  }

  return normalizeGroupCapabilities(next);
};

/** @deprecated Use {@link cycleCapabilityCell} for explicit state cycling. */
export const toggleRelationshipCapability = (
  capabilities: GroupCapabilities,
  relationship: GroupRelationship,
  cap: string,
): GroupCapabilities => cycleCapabilityCell(capabilities, relationship, cap);
