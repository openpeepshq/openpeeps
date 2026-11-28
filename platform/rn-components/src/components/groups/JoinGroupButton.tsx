import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import type { GroupWithMeta } from '@openpeepshq/common/types';
import { apiErrorMessage, useJoinGroup } from '@openpeepshq/react';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';

export interface JoinGroupButtonProps {
  group: GroupWithMeta;
  onJoined?: () => void;
}

export const JoinGroupButton = ({ group, onJoined }: JoinGroupButtonProps) => {
  const { t } = useTranslation();
  const [submitting, setSubmitting] = useState(false);
  const { canJoin, join } = useJoinGroup(group, () => {
    Toast.show({ type: 'success', text1: t('groups.join.success') });
    onJoined?.();
  });

  if (!canJoin) return null;

  const onPress = async () => {
    setSubmitting(true);
    try {
      await join();
    } catch (err) {
      Toast.show({ type: 'error', text1: apiErrorMessage(err, t) });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Button
      variant="outline"
      disabled={submitting}
      onPress={onPress}
      className="shrink-0"
    >
      <ThemedText numberOfLines={1}>
        {submitting ? t('common.states.loading') : t('groups.join.submit')}
      </ThemedText>
    </Button>
  );
};
