import { checkCapabilities } from '@openpeepshq/common/lib';
import type { Capabilities } from '@openpeepshq/common/types';

export type CapabilityCellState =
  | 'none'
  | 'implicit-remove'
  | 'implicit-add'
  | 'specific-add'
  | 'specific-remove';

export type CapabilityEditorGroup = {
  /** Prefix including trailing hyphen, e.g. `core-groups-`. */
  prefix: string;
  /** Wildcard capability for "allow all", e.g. `core-groups-*`. */
  wildcard: string;
  leaves: string[];
};

/** Capabilities grouped by column (relationship or role), e.g. `{ member: { add, remove } }`. */
export type MatrixCapabilities = Record<string, Capabilities>;

export interface CapabilityMatrixOptions {
  /** Editor capability keys (leaves + wildcard allows). */
  editorKeys: readonly string[];
  /** Column keys rendered across the matrix (relationships or role keys). */
  columns: readonly string[];
  /**
   * Column that applies to "everyone" and implicitly cascades to the other
   * columns (add => implicit allow, wildcard deny => locked). Omit when there is
   * no such column — e.g. instance roles, which are independent of each other.
   */
  everyoneColumn?: string;
}

const wildcardPrefix = (wildcard: string) => wildcard.replace(/\*$/, '');

/** Order-independent equality check for two capability add/remove arrays. */
export const capabilitySetsEqual = (
  a: string[] | undefined,
  b: string[] | undefined,
) => {
  const sa = new Set(a ?? []);
  const sb = new Set(b ?? []);
  if (sa.size !== sb.size) return false;
  return [...sa].every((v) => sb.has(v));
};

/**
 * Returns only the columns whose add/remove lists differ from `defaults`, so a
 * save never persists relationship buckets that are identical to the defaults.
 */
export const diffRelationshipMatrix = (
  edited: Record<string, Capabilities> | undefined,
  defaults: Record<string, Capabilities> | undefined,
  columns: readonly string[],
): Record<string, Capabilities> => {
  const result: Record<string, Capabilities> = {};
  for (const column of columns) {
    const e = edited?.[column] ?? { add: [], remove: [] };
    const d = defaults?.[column] ?? { add: [], remove: [] };
    if (
      !capabilitySetsEqual(e.add, d.add) ||
      !capabilitySetsEqual(e.remove, d.remove)
    ) {
      result[column] = { add: e.add ?? [], remove: e.remove ?? [] };
    }
  }
  return result;
};

/** Split editor keys into prefix groups with an optional `…-*` allow-all. */
export const capabilityEditorGroups = (
  editorKeys: readonly string[],
): CapabilityEditorGroup[] => {
  const wildcards = [...editorKeys]
    .filter((key) => key.endsWith('*'))
    .sort((a, b) => b.length - a.length);
  const leaves = [...editorKeys].filter((key) => !key.includes('*'));

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

export const columnAdds = (capabilities: MatrixCapabilities, column: string) =>
  capabilities?.[column]?.add ?? [];

export const columnRemoves = (
  capabilities: MatrixCapabilities,
  column: string,
) => capabilities?.[column]?.remove ?? [];

export const hasExplicitCap = (
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
) => columnAdds(capabilities, column).includes(cap);

export const hasExplicitRemove = (
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
) => columnRemoves(capabilities, column).includes(cap);

const isMatchedByWildcard = (cap: string, granted: string) =>
  granted.includes('*') && cap.startsWith(granted.split('*')[0] ?? '');

/** True when an add-list wildcard covers `cap` (same rule as `checkCapabilities`). */
export const isCoveredByWildcard = (
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
) =>
  columnAdds(capabilities, column).some((granted) =>
    isMatchedByWildcard(cap, granted),
  );

/** True when a remove-list wildcard covers `cap`. */
export const isCoveredByWildcardRemove = (
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
) =>
  columnRemoves(capabilities, column).some((denied) =>
    isMatchedByWildcard(cap, denied),
  );

/** Effective grant after wildcards and remove (matches runtime checks). */
export const isEffectivelyGranted = (
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
) => checkCapabilities([cap], capabilities?.[column] ?? {}).success;

/** True when the everyone column grants `cap`. */
export const isGrantedByColumn = (
  capabilities: MatrixCapabilities,
  everyoneColumn: string | undefined,
  cap: string,
) =>
  everyoneColumn
    ? isEffectivelyGranted(capabilities, everyoneColumn, cap)
    : false;

export const setColumnAdds = (
  capabilities: MatrixCapabilities,
  column: string,
  add: string[],
): MatrixCapabilities => ({
  ...capabilities,
  [column]: {
    ...capabilities?.[column],
    add,
  },
});

export const setColumnRemoves = (
  capabilities: MatrixCapabilities,
  column: string,
  remove: string[],
): MatrixCapabilities => ({
  ...capabilities,
  [column]: {
    ...capabilities?.[column],
    remove,
  },
});

const implicitAddFromColumn = (
  options: CapabilityMatrixOptions,
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
) => {
  const { everyoneColumn } = options;
  if (!everyoneColumn || column === everyoneColumn) {
    return false;
  }
  if (!isGrantedByColumn(capabilities, everyoneColumn, cap)) {
    return false;
  }
  if (hasExplicitCap(capabilities, column, cap)) {
    return false;
  }
  if (isCoveredByWildcard(capabilities, column, cap)) {
    return false;
  }
  return true;
};

const implicitRemoveFromColumn = (
  capabilities: MatrixCapabilities,
  everyoneColumn: string | undefined,
  cap: string,
) =>
  everyoneColumn
    ? isCoveredByWildcardRemove(capabilities, everyoneColumn, cap)
    : false;

export const getCapabilityCellState = (
  options: CapabilityMatrixOptions,
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
): CapabilityCellState => {
  const { everyoneColumn } = options;
  const explicitAdd = hasExplicitCap(capabilities, column, cap);
  const explicitRemove = hasExplicitRemove(capabilities, column, cap);
  const implicitAddHere =
    isCoveredByWildcard(capabilities, column, cap) && !explicitAdd;
  const implicitAddFromEveryone = implicitAddFromColumn(
    options,
    capabilities,
    column,
    cap,
  );

  if (
    everyoneColumn &&
    column !== everyoneColumn &&
    implicitRemoveFromColumn(capabilities, everyoneColumn, cap)
  ) {
    return 'implicit-remove';
  }
  if (explicitRemove) {
    return 'specific-remove';
  }
  if (isCoveredByWildcardRemove(capabilities, column, cap)) {
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

const patchColumn = (
  capabilities: MatrixCapabilities,
  column: string,
  add: string[],
  remove: string[],
): MatrixCapabilities => ({
  ...capabilities,
  [column]: {
    ...capabilities?.[column],
    add,
    remove,
  },
});

const stripPrefixFromRemove = (remove: string[], prefix: string) =>
  remove.filter((item) => !item.startsWith(prefix));

/** Drop redundant explicit entries after wildcard add/remove changes. */
export const normalizeColumnCapabilities = (
  options: CapabilityMatrixOptions,
  capabilities: MatrixCapabilities,
  column: string,
): MatrixCapabilities => {
  const { editorKeys, everyoneColumn } = options;
  let add = [...columnAdds(capabilities, column)];
  let remove = [...columnRemoves(capabilities, column)];

  const snapshot = () => patchColumn(capabilities, column, add, remove);

  for (const cap of editorKeys) {
    const caps = snapshot();
    if (
      everyoneColumn &&
      column !== everyoneColumn &&
      isGrantedByColumn(caps, everyoneColumn, cap)
    ) {
      add = add.filter((item) => item !== cap);
    }
    if (
      everyoneColumn &&
      column !== everyoneColumn &&
      implicitRemoveFromColumn(caps, everyoneColumn, cap)
    ) {
      add = add.filter((item) => item !== cap);
      if (!cap.endsWith('*') && remove.includes(cap)) {
        remove = remove.filter((item) => item !== cap);
      }
    }
    if (isCoveredByWildcardRemove(caps, column, cap)) {
      add = add.filter((item) => item !== cap);
    }
    if (
      isCoveredByWildcard(caps, column, cap) &&
      add.includes(cap) &&
      !cap.endsWith('*')
    ) {
      add = add.filter((item) => item !== cap);
    }
    if (
      isCoveredByWildcardRemove(caps, column, cap) &&
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

  return patchColumn(capabilities, column, add, remove);
};

export const normalizeCapabilities = (
  options: CapabilityMatrixOptions,
  capabilities: MatrixCapabilities,
): MatrixCapabilities => {
  let next = capabilities;
  for (const column of options.columns) {
    next = normalizeColumnCapabilities(options, next, column);
  }
  return next;
};

export const cycleCapabilityCell = (
  options: CapabilityMatrixOptions,
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
): MatrixCapabilities => {
  const state = getCapabilityCellState(options, capabilities, column, cap);
  if (state === 'implicit-remove') {
    return capabilities;
  }

  const add = columnAdds(capabilities, column);
  const remove = columnRemoves(capabilities, column);
  const prefix = cap.endsWith('*') ? wildcardPrefix(cap) : undefined;

  let next: MatrixCapabilities;

  switch (state) {
    case 'implicit-add':
      next = setColumnRemoves(capabilities, column, [...remove, cap]);
      break;
    case 'specific-remove': {
      const { everyoneColumn } = options;
      const implicitGrant =
        (isCoveredByWildcard(capabilities, column, cap) &&
          !hasExplicitCap(capabilities, column, cap)) ||
        (everyoneColumn
          ? implicitAddFromColumn(options, capabilities, column, cap)
          : false);
      next = setColumnRemoves(
        capabilities,
        column,
        remove.filter((item) => item !== cap),
      );
      if (!implicitGrant && prefix) {
        next = setColumnRemoves(
          next,
          column,
          stripPrefixFromRemove(columnRemoves(next, column), prefix),
        );
      }
      break;
    }
    case 'specific-add':
      next = patchColumn(
        capabilities,
        column,
        add.filter((item) => item !== cap),
        [...remove, cap],
      );
      break;
    case 'none':
      next = patchColumn(capabilities, column, [...add, cap], remove);
      break;
    default:
      next = capabilities;
  }

  return normalizeCapabilities(options, next);
};

/** @deprecated Use {@link cycleCapabilityCell} for explicit state cycling. */
export const toggleCapabilityCell = (
  options: CapabilityMatrixOptions,
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
): MatrixCapabilities =>
  cycleCapabilityCell(options, capabilities, column, cap);
