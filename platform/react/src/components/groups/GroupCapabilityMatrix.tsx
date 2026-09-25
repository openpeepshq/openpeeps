import type { GroupData } from '@openpeepshq/common/types';
import {
  groupCapabilityEditorKeys,
  groupCapabilityEditorRelationships,
} from '@openpeepshq/common/types';
import { useT } from '../../i18n';
import { CapabilityMatrix } from '../CapabilityMatrix';
import type { CapabilityMatrixColumn } from '../CapabilityMatrix';

export interface GroupCapabilityMatrixProps {
  capabilities: GroupData['capabilities'];
  onChange: (capabilities: GroupData['capabilities']) => void;
}

export function GroupCapabilityMatrix({
  capabilities,
  onChange,
}: GroupCapabilityMatrixProps) {
  const t = useT();
  const columns: CapabilityMatrixColumn[] =
    groupCapabilityEditorRelationships.map((relationship) => ({
      key: relationship,
      label: t(`groups.roles.${relationship}`, { defaultValue: relationship }),
    }));

  return (
    <CapabilityMatrix
      editorKeys={[...groupCapabilityEditorKeys]}
      columns={columns}
      value={capabilities}
      onChange={onChange}
      i18nPrefix="groups.capabilities"
      stateI18nPrefix="groups.capabilities.state"
      everyoneColumn="none"
    />
  );
}
