import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupWithMeta, PublicProfile } from '@openpeepshq/common/types';
import { useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '../ui/themed-text';
import { useControlledSheet } from '../../hooks/use-controlled-sheet';
import { BaseSheet, SheetFooter } from '../custom/modals/common';

export interface ConfirmMemberRemovalModalProps {
  group: GroupWithMeta;
  profile: PublicProfile;
  onClose: () => void;
}

export const ConfirmMemberRemovalModal = ({
  group,
  profile,
  onClose,
}: ConfirmMemberRemovalModalProps) => {
  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();
  const removeMember = openpeepsApi.removeGroupMemberAction({
    id: group.id,
    memberId: profile.id,
  });
  const ref = useControlledSheet(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await removeMember();
      onClose();
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
          {t('groups.removeMember.title')}
        </ThemedText>
        <ThemedText className="mb-6 text-center text-base text-muted-foreground">
          {t('groups.removeMember.description', { handle: profile.handle })}
        </ThemedText>
        {error ? (
          <ThemedText className="mb-4 text-center text-sm text-destructive">
            {error}
          </ThemedText>
        ) : null}
        <SheetFooter
          onCancel={onClose}
          cancelText={t('common.cancel')}
          onConfirm={() => void submit()}
          confirmText={
            submitting
              ? t('groups.removeMember.loading')
              : t('groups.removeMember.confirm')
          }
          confirmVariant="destructive"
          disabled={submitting}
        />
      </View>
    </BaseSheet>
  );
};
