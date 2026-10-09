import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupData } from '@openpeepshq/common';
import {
  useGroupTemplateSelection,
  type GroupFormFieldErrors,
} from '@openpeepshq/react';
import { HeaderAvatarInput, RadioSelect } from '../form/index';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { ThemedText } from '../ui/themed-text';
import { GroupCapabilityMatrix } from './GroupCapabilityMatrix';

export type { GroupFormFieldErrors };

export type GroupFormSection = 'info' | 'roles';

export interface GroupFormProps {
  groupData: GroupData;
  onChange: (data: GroupData) => void;
  fieldErrors?: GroupFormFieldErrors;
  /** Hide handle when editing an existing group. */
  isEdit?: boolean;
  /** Which blocks to render. Create uses both; edit screens pass one. */
  sections?: GroupFormSection[];
}

export const GroupForm = ({
  groupData,
  onChange,
  fieldErrors,
  isEdit = false,
  sections = ['info', 'roles'],
}: GroupFormProps) => {
  const { t } = useTranslation();
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
    <View className="gap-y-4">
      {showInfo ? (
        <>
          <HeaderAvatarInput
            header={groupData.header ?? undefined}
            avatar={groupData.avatar ?? undefined}
            onHeaderChange={(header) => patch({ header })}
            onAvatarChange={(avatar) => patch({ avatar })}
            usage={{ header: 'group-header', avatar: 'group-avatar' }}
          />

          <View className="gap-y-2 px-1">
            <Label nativeID="displayName">
              {t('groups.form.groupName', { defaultValue: 'Group name' })}
            </Label>
            <Input
              value={groupData.displayName ?? ''}
              onChangeText={(displayName) => patch({ displayName })}
              className={fieldErrors?.displayName ? 'border-destructive' : ''}
              autoCapitalize="none"
            />
            {fieldErrors?.displayName ? (
              <ThemedText className="text-destructive text-sm">
                {fieldErrors.displayName}
              </ThemedText>
            ) : null}
          </View>

          {!isEdit ? (
            <View className="gap-y-2 px-1">
              <Label nativeID="handle">
                {t('groups.handle.title', { defaultValue: 'Handle' })}
              </Label>
              <Input
                value={groupData.handle ?? ''}
                onChangeText={(handle) => patch({ handle })}
                className={fieldErrors?.handle ? 'border-destructive' : ''}
                placeholder={t('groups.handle.placeholder', {
                  defaultValue: 'my_group',
                })}
                autoCapitalize="none"
              />
              {fieldErrors?.handle ? (
                <ThemedText className="text-destructive text-sm">
                  {fieldErrors.handle}
                </ThemedText>
              ) : null}
            </View>
          ) : null}

          <View className="gap-y-2 px-1">
            <Label nativeID="description">
              {t('groups.description.title', { defaultValue: 'Description' })}
            </Label>
            <Textarea
              value={groupData.description ?? ''}
              placeholder={t('groups.description.placeholder', {
                defaultValue: '',
              })}
              onChangeText={(description) => patch({ description })}
            />
          </View>

          <View className="gap-y-2 px-1">
            <Label nativeID="rules">
              {t('groups.rules.title', { defaultValue: 'Rules' })}
            </Label>
            <Textarea
              value={groupData.rules ?? ''}
              placeholder={t('groups.rules.placeholder', { defaultValue: '' })}
              onChangeText={(rules) => patch({ rules })}
            />
          </View>
        </>
      ) : null}

      {showRoles ? (
        <>
          <RadioSelect
            title={t('groups.templates.title', { defaultValue: 'Group type' })}
            description={templateDescription}
            value={templateSelection}
            options={templateOptions}
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
    </View>
  );
};
