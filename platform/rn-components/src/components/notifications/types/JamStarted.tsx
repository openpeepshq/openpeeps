import { View } from 'react-native';
import React from 'react';
import { ThemedText } from '../../ui/themed-text';
import { NotificationWrapper } from '../NotificationWrapper';
import { PublicNotification } from '@openpeepshq/common';
import { profileName } from '../../../lib/utils';
import { UpdatingDate } from '../../custom/date/updating-date';
import { JamCard } from '../../jams/JamCard';
import { useTranslation } from 'react-i18next';

interface NotificationTypeProps {
  notification: PublicNotification;
}
export const JamStarted: React.FC<NotificationTypeProps> = ({
  notification,
}) => {
  const profile = notification.senderProfile!;
  const { t } = useTranslation();
  const eventName =
    notification.post?.data?.type === 'event'
      ? notification.post.data.name?.trim()
      : undefined;

  return (
    <NotificationWrapper profile={profile} seen={notification.seen}>
      <View className="w-full">
        <View className="mb-2 min-w-0 flex-row flex-wrap items-center gap-2">
          <ThemedText className="shrink">
            {t(
              eventName
                ? 'notification.jamStarted.text'
                : 'notification.jamStarted.textNoEvent',
              {
                profileName: profileName(profile),
                eventName,
              }
            )}
          </ThemedText>
          <UpdatingDate date={notification.createdAt} />
        </View>
        {notification.post?.type === 'event' ? (
          <View className="min-w-0">
            <JamCard jamPost={notification.post} />
          </View>
        ) : null}
      </View>
    </NotificationWrapper>
  );
};
