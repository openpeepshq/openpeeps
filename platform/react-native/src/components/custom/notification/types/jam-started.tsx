import { View } from 'react-native';
import React from 'react';
import { ThemedText } from '~/components/ui/themed-text';
import { NotificationWrapper } from '../NotificationWrapper';
import { PublicNotification } from '@openpeeps/common';
import { profileName } from '~/lib/utils';
import { UpdatingDate } from '../../date/updating-date';
import { JamCard } from '../../jam/jam-card';
import { useTranslation } from 'react-i18next';

interface NotificationTypeProps {
  notification: PublicNotification;
}
export const JamStarted: React.FC<NotificationTypeProps> = ({ notification }) => {
  const profile = notification.senderProfile!;
  const { t } = useTranslation();

  return (
    <NotificationWrapper profile={profile} seen={notification.seen}>
      <View className="w-full">
        <View className="mb-2 flex flex-row items-center gap-2 font-semibold text-wrap flex-wrap">
          <ThemedText>
            {t('notification.jamStarted.text', {
              profileName: profileName(profile),
            })}{' '}
          </ThemedText>
          <UpdatingDate date={notification.createdAt} />
        </View>
        {notification.post?.type === 'event' && (
          <JamCard
            jamPost={notification.post!} />
        )}
      </View>
    </NotificationWrapper>
  );
};
