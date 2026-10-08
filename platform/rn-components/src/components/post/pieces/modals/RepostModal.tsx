import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { RepostWithPublicProfile } from '@openpeepshq/common';
import { BaseSheet } from '~/components/custom/modals/common';
import { ThemedText } from '~/components/ui/themed-text';
import { useControlledSheet } from '~/hooks/use-controlled-sheet';
import { ProfileWithActionCard } from '../../../profile/ProfileWithActionCard';

export interface RepostModalProps {
  reposts: RepostWithPublicProfile[];
  /** Authoritative total; may exceed `reposts.length` when the list is capped. */
  repostCount: number;
  open: boolean;
  onClose: () => void;
}

export const RepostModal = ({
  reposts,
  repostCount,
  open,
  onClose,
}: RepostModalProps) => {
  const { t } = useTranslation();
  const ref = useControlledSheet(open);
  const moreCount = Math.max(0, repostCount - reposts.length);

  return (
    <BaseSheet ref={ref} snapPoints={['80%']} scrollable onDismiss={onClose}>
      <View className="px-4 pb-3">
        <ThemedText className="mb-4 text-center text-xl font-semibold">
          {t('posts.repostModal.title')}
        </ThemedText>
        {reposts.length ? (
          <>
            {reposts.map((repost) => (
              <ProfileWithActionCard
                key={repost.profile.id}
                profile={repost.profile}
              />
            ))}
            {moreCount > 0 ? (
              <ThemedText className="px-5 pt-2 text-center text-sm text-muted-foreground">
                {t('posts.repostModal.andMore', { count: moreCount })}
              </ThemedText>
            ) : null}
          </>
        ) : (
          <ThemedText className="p-5 text-center text-sm text-muted-foreground">
            {t('posts.repostModal.empty')}
          </ThemedText>
        )}
      </View>
    </BaseSheet>
  );
};
