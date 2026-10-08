import React from 'react';
import { TabScreensHeader } from '~/components/custom';
import { ThemedView } from '~/components/ui/themed-view';
import { ThemedText } from '~/components/ui/themed-text';
import { View } from 'react-native';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import {
  NotificationHeaderActions,
  NotificationsList,
} from '~/components/notifications';
import { useNotificationBadgeReset } from '~/hooks/use-notification-badge-reset';

export const Notifications = () => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const query = openpeepsApi.useCurrentProfileNotifications({
    limit: 15,
  });
  const notificationStats = openpeepsApi.useCurrentProfileNotificationStats();

  useNotificationBadgeReset({
    refetchFeed: () => query.refetch(),
  });

  return (
    <ThemedView className="grow">
      <TabScreensHeader
        children={
          <View className="flex-row items-center justify-between">
            <ThemedText className="text-xl font-bold">
              {t('navigation.notifications')}
            </ThemedText>
            <NotificationHeaderActions />
          </View>
        }
      />
      <NotificationsList
        query={query}
        onRefresh={async () => {
          await Promise.all([query.refetch(), notificationStats.refetch()]);
        }}
      />
    </ThemedView>
  );
};
