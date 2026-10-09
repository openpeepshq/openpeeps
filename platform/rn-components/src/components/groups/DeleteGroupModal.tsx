import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { groupName } from '@openpeepshq/common/lib';
import { useOpenpeeps, useRouter } from '@openpeepshq/react';
import { ThemedText } from '../ui/themed-text';
import { useControlledSheet } from '../../hooks/use-controlled-sheet';
import { BaseSheet, SheetFooter } from '../custom/modals/common';

export interface DeleteGroupModalProps {
  group: GroupWithMeta;
  onClose: () => void;
}

export const DeleteGroupModal = ({ group, onClose }: DeleteGroupModalProps) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { openpeepsApi } = useOpenpeeps();
  const deleteGroup = openpeepsApi.deleteGroupAction({ id: group.id });
  const ref = useControlledSheet(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await deleteGroup();
      onClose();
      router.back();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <BaseSheet ref={ref} onDismiss={onClose}>
      <View className="flex-1 p-4">
        <ThemedText className="mb-6 text-center text-xl font-semibold">
          {t('groups.delete.title')}
        </ThemedText>
        <ThemedText className="mb-6 text-center text-base text-muted-foreground">
          {t('groups.delete.description', { groupName: groupName(group) })}
        </ThemedText>
        {error ? (
          <ThemedText className="mb-4 text-center text-sm text-destructive">
            {error}
          </ThemedText>
        ) : null}
        <SheetFooter
          onCancel={onClose}
          cancelText={t('groups.delete.cancel')}
          onConfirm={() => void submit()}
          confirmText={
            submitting
              ? t('groups.delete.deleting')
              : t('groups.delete.deleteButton')
          }
          confirmVariant="destructive"
          disabled={submitting}
        />
      </View>
    </BaseSheet>
  );
};
