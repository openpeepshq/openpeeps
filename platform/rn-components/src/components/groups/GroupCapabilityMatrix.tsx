import React from 'react';
import { useTranslation } from 'react-i18next';
import type { GroupData } from '@openpeepshq/common';
import {
  groupCapabilityEditorKeys,
  groupCapabilityEditorRelationships,
} from '@openpeepshq/common';
import {
  CapabilityMatrix,
  type CapabilityMatrixColumn,
} from '../CapabilityMatrix';

export interface GroupCapabilityMatrixProps {
  capabilities: GroupData['capabilities'];
  onChange: (capabilities: GroupData['capabilities']) => void;
}

export const GroupCapabilityMatrix = ({
  capabilities,
  onChange,
}: GroupCapabilityMatrixProps) => {
  const { t } = useTranslation();
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
};
