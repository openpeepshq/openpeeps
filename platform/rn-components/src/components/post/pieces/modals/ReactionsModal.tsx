import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { ReactionWithPublicProfile } from '@openpeepshq/common';
import { BaseSheet } from '../../../custom/modals/common/index';
import { ThemedText } from '../../../ui/themed-text';
import { useControlledSheet } from '../../../../hooks/use-controlled-sheet';
import { ProfileWithActionCard } from '../../../profile/ProfileWithActionCard';

export interface ReactionsModalProps {
  reactions: ReactionWithPublicProfile[];
  open: boolean;
  onClose: () => void;
}

export const ReactionsModal = ({
  reactions,
  open,
  onClose,
}: ReactionsModalProps) => {
  const { t } = useTranslation();
  const ref = useControlledSheet(open);

  return (
    <BaseSheet ref={ref} snapPoints={['80%']} scrollable onDismiss={onClose}>
      <View className="px-4 pb-3">
        <ThemedText className="mb-4 text-center text-xl font-semibold">
          {t('posts.reactionsModal.title')}
        </ThemedText>
        {reactions.map(({ reaction, profile }) => (
          <ProfileWithActionCard
            key={profile.id}
            profile={profile}
            leading={<ThemedText>{reaction}</ThemedText>}
          />
        ))}
        {reactions.length === 0 ? (
          <ThemedText className="p-5 text-center text-sm text-muted-foreground">
            {t('posts.reactionsModal.empty')}
          </ThemedText>
        ) : null}
      </View>
    </BaseSheet>
  );
};
