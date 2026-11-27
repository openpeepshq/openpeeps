import { View } from 'react-native';
import React from 'react';
import { ThemedText } from '../../ui/themed-text';
import { NotificationWrapper } from '../NotificationWrapper';
import { PublicNotification } from '@openpeepshq/common';
import { profileName } from '../../../lib/utils';
import { UpdatingDate } from '../../custom/date/updating-date';
import { useTranslation } from 'react-i18next';

interface NotificationTypeProps {
  notification: PublicNotification;
}

export const CoOrganizerAdded: React.FC<NotificationTypeProps> = ({
  notification,
}) => {
  const profile = notification.senderProfile!;
  const { t } = useTranslation();

  return (
    <NotificationWrapper profile={profile} seen={notification.seen}>
      <View className="w-full">
        <View className="flex w-full items-center justify-between">
          <View className="mb-2 flex flex-row items-center gap-2 font-semibold flex-wrap">
            <ThemedText>
              {t('notification.coOrganizerAdded.text', {
                profileName: profileName(profile),
              })}
            </ThemedText>
            <UpdatingDate date={notification.createdAt} />
          </View>
        </View>
      </View>
    </NotificationWrapper>
  );
};
