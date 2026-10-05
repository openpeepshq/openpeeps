import {
  groupCapabilityEditorKeys,
  groupCapabilityEditorRelationships,
} from '@openpeepshq/common/types';
import {
  capabilityEditorGroups,
  type CapabilityCellState,
  type CapabilityEditorGroup,
  type CapabilityMatrixOptions,
  type MatrixCapabilities,
  getCapabilityCellState as _getCapabilityCellState,
  cycleCapabilityCell as _cycleCapabilityCell,
  normalizeColumnCapabilities as _normalizeColumnCapabilities,
  normalizeCapabilities as _normalizeCapabilities,
  toggleCapabilityCell as _toggleCapabilityCell,
  isGrantedByColumn,
} from './capabilityMatrix';

export {
  columnAdds as relationshipAdds,
  columnRemoves as relationshipRemoves,
  hasExplicitCap,
  hasExplicitRemove,
  isCoveredByWildcard,
  isCoveredByWildcardRemove,
  isEffectivelyGranted,
  setColumnAdds as setRelationshipAdds,
  setColumnRemoves as setRelationshipRemoves,
} from './capabilityMatrix';

export type { CapabilityCellState, CapabilityEditorGroup };

const groupOptions: CapabilityMatrixOptions = {
  editorKeys: [...groupCapabilityEditorKeys],
  columns: [...groupCapabilityEditorRelationships],
  everyoneColumn: 'none',
};

/** @deprecated Prefer {@link capabilityEditorGroups} from `capabilityMatrix`. */
export const groupCapabilityEditorGroups = () =>
  capabilityEditorGroups(groupOptions.editorKeys);

export const isGrantedByNone = (
  capabilities: MatrixCapabilities,
  cap: string,
) => isGrantedByColumn(capabilities, 'none', cap);

export const getCapabilityCellState = (
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
) => _getCapabilityCellState(groupOptions, capabilities, column, cap);

export const normalizeRelationshipCapabilities = (
  capabilities: MatrixCapabilities,
  column: string,
) => _normalizeColumnCapabilities(groupOptions, capabilities, column);

export const normalizeGroupCapabilities = (capabilities: MatrixCapabilities) =>
  _normalizeCapabilities(groupOptions, capabilities);

export const cycleCapabilityCell = (
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
) => _cycleCapabilityCell(groupOptions, capabilities, column, cap);

/** @deprecated Use {@link cycleCapabilityCell} for explicit state cycling. */
export const toggleRelationshipCapability = (
  capabilities: MatrixCapabilities,
  column: string,
  cap: string,
) => _toggleCapabilityCell(groupOptions, capabilities, column, cap);
