import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import type { PublicProfile } from '@openpeepshq/common/types';
import { ProfileCard } from '~/components/profile/ProfileCard';
import { ThemedText } from '~/components/ui/themed-text';
import { useControlledSheet } from '~/hooks/use-controlled-sheet';
import { BaseSheet } from '../custom/modals/common';

export interface ConversationParticipantsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  participants: PublicProfile[];
}

export const ConversationParticipantsModal = ({
  open,
  onOpenChange,
  participants,
}: ConversationParticipantsModalProps) => {
  const { t } = useTranslation();
  const ref = useControlledSheet(open);

  return (
    <BaseSheet
      ref={ref}
      snapPoints={['85%']}
      scrollable
      onDismiss={() => onOpenChange(false)}
    >
      <View className="p-6 pb-2">
        <ThemedText className="text-lg font-semibold">
          {t('conversations.participants.title')}
        </ThemedText>
      </View>
      {participants.map((profile) => (
        <ProfileCard key={profile.id} profile={profile} hasAction={false} />
      ))}
    </BaseSheet>
  );
};
