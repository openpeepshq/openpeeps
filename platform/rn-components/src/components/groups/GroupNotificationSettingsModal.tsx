import { useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  groupName,
  groupNotificationLevelOptions,
  type GroupNotificationLevel,
  type GroupWithMeta,
} from '@openpeepshq/common';
import { useGroupNotificationLevel } from '@openpeepshq/react';
import { BellIcon } from '../icons/index';
import { ThemedText } from '../ui/themed-text';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { useControlledSheet } from '../../hooks/use-controlled-sheet';
import { BaseSheet, SheetFooter } from '../custom/modals/common';

export interface GroupNotificationSettingsModalProps {
  group: GroupWithMeta;
  onClose: () => void;
}

const optionLabelKey: Record<GroupNotificationLevel, string> = {
  all: 'groups.modals.manageNotifications.options.all',
  mostRelevant: 'groups.modals.manageNotifications.options.mostRelevant',
  off: 'groups.modals.manageNotifications.options.off',
};

const optionDescriptionKey: Record<GroupNotificationLevel, string> = {
  all: 'groups.modals.manageNotifications.options.allDescription',
  mostRelevant:
    'groups.modals.manageNotifications.options.mostRelevantDescription',
  off: 'groups.modals.manageNotifications.options.offDescription',
};

export const GroupNotificationSettingsModal = ({
  group,
  onClose,
}: GroupNotificationSettingsModalProps) => {
  const { t } = useTranslation();
  const ref = useControlledSheet(true);
  const { level, setLevel, save, saving, ready, loadFailed, error } =
    useGroupNotificationLevel(group.id);

  const onSave = async () => {
    const saved = await save();
    if (!saved) return;
    Toast.show({
      type: 'success',
      text1: t('groups.modals.manageNotifications.saved', {
        defaultValue: 'Group notification settings updated.',
      }),
    });
    onClose();
  };

  return (
    <BaseSheet ref={ref} onDismiss={onClose}>
      <View className="flex-1 p-4">
        <ThemedText className="mb-2 text-center text-xl font-semibold">
          {t('groups.modals.manageNotifications.title')}
        </ThemedText>
        <ThemedText className="mb-6 text-center text-base text-muted-foreground">
          {t('groups.modals.manageNotifications.description', {
            groupName: groupName(group),
          })}
        </ThemedText>
        {ready ? (
          <RadioGroup
            value={level}
            onValueChange={(value) => setLevel(value as GroupNotificationLevel)}
          >
            {groupNotificationLevelOptions.map((option) => (
              <View key={option} className="mb-4 flex-row items-start gap-x-3">
                <RadioGroupItem value={option} />
                <View className="flex-1">
                  <ThemedText className="text-base font-medium">
                    {t(optionLabelKey[option])}
                  </ThemedText>
                  <ThemedText className="text-sm text-muted-foreground">
                    {t(optionDescriptionKey[option])}
                  </ThemedText>
                </View>
              </View>
            ))}
          </RadioGroup>
        ) : loadFailed ? (
          <ThemedText className="mb-4 text-center text-sm text-destructive">
            {t('groups.modals.manageNotifications.loadError', {
              defaultValue: 'Could not load notification settings.',
            })}
          </ThemedText>
        ) : (
          <ActivityIndicator className="my-8" />
        )}
        {error ? (
          <ThemedText className="mb-4 text-center text-sm text-destructive">
            {error}
          </ThemedText>
        ) : null}
        <SheetFooter
          onCancel={onClose}
          cancelText={t('common.cancel')}
          onConfirm={() => void onSave()}
          confirmText={saving ? t('common.saving') : t('common.save')}
          disabled={saving || !ready}
          isLoading={saving}
        />
      </View>
    </BaseSheet>
  );
};

export const GroupNotificationButton = ({
  group,
}: {
  group: GroupWithMeta;
}) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        className="p-2"
        accessibilityLabel={t('groups.modals.manageNotifications.title')}
        onPress={() => setOpen(true)}
      >
        <BellIcon size={20} className="text-foreground" />
      </Pressable>
      {open ? (
        <GroupNotificationSettingsModal
          group={group}
          onClose={() => setOpen(false)}
        />
      ) : null}
    </>
  );
};
