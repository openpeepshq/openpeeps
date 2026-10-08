import { useState } from 'react';
import type { GroupData } from '@openpeepshq/common/types';
import {
  applySimpleGroupTemplate,
  matchSimpleGroupTemplate,
  simpleGroupTemplateOptions,
  type SimpleGroupTemplateId,
} from '@openpeepshq/common/lib';
import { useT } from '../../i18n/context';
import { useServerInfo } from '../../components/server-data/context';

export type UseGroupTemplateSelectionArgs = {
  groupData: GroupData;
  onChange: (data: GroupData) => void;
  isEdit: boolean;
};

/**
 * Group-type radio ↔ capability-matrix sync: custom when caps diverge from
 * every preset, otherwise the matching template. On create, custom is also
 * selected when the user explicitly opens the matrix.
 */
export const useGroupTemplateSelection = ({
  groupData,
  onChange,
  isEdit,
}: UseGroupTemplateSelectionArgs) => {
  const t = useT();
  const { publicContent } = useServerInfo();
  const [customMatrixOpen, setCustomMatrixOpen] = useState(false);
  const showCapabilityMatrix = isEdit || customMatrixOpen;

  const templateSelection =
    !isEdit && customMatrixOpen
      ? 'custom'
      : matchSimpleGroupTemplate(groupData.capabilities);

  const templateOptions = [
    ...simpleGroupTemplateOptions(publicContent).map((templateId) => ({
      value: templateId,
      title: t(`groups.templates.${templateId}.title`, {
        defaultValue: templateId,
      }),
      description: t(`groups.templates.${templateId}.description`, {
        defaultValue: '',
      }),
    })),
    {
      value: 'custom',
      title: t('groups.templates.custom.title', {
        defaultValue: 'Custom group',
      }),
      description: t('groups.templates.custom.description', {
        defaultValue: 'Capabilities do not match a standard template',
      }),
    },
  ];

  const onTemplateChange = (value: string) => {
    if (value === 'custom') {
      if (!isEdit) {
        setCustomMatrixOpen(true);
      }
      return;
    }
    if (!isEdit) {
      setCustomMatrixOpen(false);
    }
    onChange({
      ...groupData,
      capabilities: applySimpleGroupTemplate(value as SimpleGroupTemplateId),
    });
  };

  const templateDescription = showCapabilityMatrix
    ? t('groups.templates.description', {
        defaultValue:
          'Pick a preset, or edit the capability matrix below. The type switches to Custom when the matrix no longer matches a preset.',
      })
    : t('groups.templates.descriptionCreate', {
        defaultValue:
          'Pick a preset for your group, or choose Custom to fine-tune capabilities.',
      });

  return {
    showCapabilityMatrix,
    templateSelection,
    templateOptions,
    templateDescription,
    onTemplateChange,
  };
};
