import type { GroupData } from '@openpeepshq/common/types';
import { Input, Label, RadioSelect, Textarea } from '@openpeepshq/react-ui';
import { useT } from '../../i18n';
import type { GroupFormFieldErrors } from '../../lib/groupFormErrors';
import { useGroupTemplateSelection } from '../../hooks/groups/useGroupTemplateSelection';
import { HeaderAvatarInput } from '../form/HeaderAvatarInput';
import { GroupCapabilityMatrix } from './GroupCapabilityMatrix';

export type { GroupFormFieldErrors };

export type GroupFormSection = 'info' | 'roles';

export interface GroupFormProps {
  groupData: GroupData;
  onChange: (data: GroupData) => void;
  fieldErrors?: GroupFormFieldErrors;
  /** Hide handle when editing an existing group. */
  isEdit?: boolean;
  /**
   * Which blocks to render. Create uses both.
   * Edit screens pass a single section.
   */
  sections?: GroupFormSection[];
}

export function GroupForm({
  groupData,
  onChange,
  fieldErrors,
  isEdit = false,
  sections = ['info', 'roles'],
}: GroupFormProps) {
  const t = useT();
  const showInfo = sections.includes('info');
  const showRoles = sections.includes('roles');
  const {
    showCapabilityMatrix,
    templateSelection,
    templateOptions,
    templateDescription,
    onTemplateChange,
  } = useGroupTemplateSelection({ groupData, onChange, isEdit });

  const patch = (partial: Partial<GroupData>) =>
    onChange({ ...groupData, ...partial });

  return (
    <div className="space-y-4">
      {showInfo ? (
        <>
          <HeaderAvatarInput
            header={groupData.header ?? undefined}
            avatar={groupData.avatar ?? undefined}
            onHeaderChange={(header) => patch({ header })}
            onAvatarChange={(avatar) => patch({ avatar })}
          />

          <div className="space-y-2 px-1">
            <Label htmlFor="displayName">
              {t('groups.form.groupName', { defaultValue: 'Group name' })}
            </Label>
            <Input
              id="displayName"
              value={groupData.displayName ?? ''}
              error={Boolean(fieldErrors?.displayName)}
              aria-invalid={Boolean(fieldErrors?.displayName)}
              aria-describedby={
                fieldErrors?.displayName ? 'displayName-error' : undefined
              }
              onChange={(e) => patch({ displayName: e.target.value })}
              data-testid="groups-name-input"
            />
            {fieldErrors?.displayName ? (
              <p
                id="displayName-error"
                role="alert"
                className="text-error text-sm"
                data-testid="groups-name-error"
              >
                {fieldErrors.displayName}
              </p>
            ) : null}
          </div>

          {!isEdit ? (
            <div className="space-y-2 px-1">
              <Label htmlFor="handle">
                {t('groups.handle.title', { defaultValue: 'Handle' })}
              </Label>
              <Input
                id="handle"
                value={groupData.handle ?? ''}
                error={Boolean(fieldErrors?.handle)}
                aria-invalid={Boolean(fieldErrors?.handle)}
                aria-describedby={
                  fieldErrors?.handle ? 'handle-error' : undefined
                }
                placeholder={t('groups.handle.placeholder', {
                  defaultValue: 'my_group',
                })}
                onChange={(e) => patch({ handle: e.target.value })}
                data-testid="groups-handle-input"
              />
              {fieldErrors?.handle ? (
                <p
                  id="handle-error"
                  role="alert"
                  className="text-error text-sm"
                  data-testid="groups-handle-error"
                >
                  {fieldErrors.handle}
                </p>
              ) : null}
            </div>
          ) : null}

          <div className="space-y-2 px-1">
            <Label htmlFor="description">
              {t('groups.description.title', { defaultValue: 'Description' })}
            </Label>
            <Textarea
              id="description"
              rows={4}
              value={groupData.description ?? ''}
              placeholder={t('groups.description.placeholder', {
                defaultValue: '',
              })}
              onChange={(e) => patch({ description: e.target.value })}
              data-testid="groups-description-input"
            />
          </div>

          <div className="space-y-2 px-1">
            <Label htmlFor="rules">
              {t('groups.rules.title', { defaultValue: 'Rules' })}
            </Label>
            <Textarea
              id="rules"
              rows={4}
              value={groupData.rules ?? ''}
              placeholder={t('groups.rules.placeholder', { defaultValue: '' })}
              onChange={(e) => patch({ rules: e.target.value })}
              data-testid="groups-rules-input"
            />
          </div>
        </>
      ) : null}

      {showRoles ? (
        <>
          <RadioSelect
            title={t('groups.templates.title', {
              defaultValue: 'Group type',
            })}
            description={templateDescription}
            value={templateSelection}
            options={templateOptions}
            optionTestId={(value) => `groups-template-${value}`}
            onChange={onTemplateChange}
          />

          {showCapabilityMatrix ? (
            <GroupCapabilityMatrix
              capabilities={groupData.capabilities}
              onChange={(capabilities) => patch({ capabilities })}
            />
          ) : null}
        </>
      ) : null}
    </div>
  );
}
