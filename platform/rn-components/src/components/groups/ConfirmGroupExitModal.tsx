import React, { useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { useNavigate, useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '../ui/themed-text';
import { useControlledSheet } from '../../hooks/use-controlled-sheet';
import { BaseSheet, SheetFooter } from '../custom/modals/common';

export interface ConfirmGroupExitModalProps {
  group: GroupWithMeta;
  onClose: () => void;
}

export const ConfirmGroupExitModal = ({
  group,
  onClose,
}: ConfirmGroupExitModalProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { openpeepsApi } = useOpenpeeps();
  const leaveGroup = openpeepsApi.leaveGroupAction({ id: group.id });
  const ref = useControlledSheet(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    setError(null);
    setSubmitting(true);
    try {
      await leaveGroup();
      onClose();
      navigate({ type: 'groups' });
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
          {t('groups.modals.confirmExit.title')}
        </ThemedText>
        <ThemedText className="mb-6 text-center text-base text-muted-foreground">
          {t('groups.modals.confirmExit.body', { handle: group.handle })}
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
          confirmText={t('groups.modals.confirmExit.leave')}
          confirmVariant="destructive"
          disabled={submitting}
        />
      </View>
    </BaseSheet>
  );
};
