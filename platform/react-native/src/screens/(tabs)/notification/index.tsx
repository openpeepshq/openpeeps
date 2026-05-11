import React, { useState } from 'react';
import { TabScreensHeader } from '~/components/custom';
import { ThemedView } from '~/components/ui/themed-view';
import { ThemedText } from '~/components/ui/themed-text';
import { View } from 'react-native';
import { useOpenpeeps } from '@openpeeps/react';
import { useTranslation } from 'react-i18next';
import { NotificationFeed } from '~/components/custom/notification/NotificationFeed';
import { setAppBadgeCount } from '~/lib/notification-helpers';

export const Notifications = () => {
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const query = openpeepsApi.useCurrentProfileNotifications({
    limit: 15,
  });

  const markAllNotificationsAsSeen =
    openpeepsApi.markAllNotificationsAsSeenAction();

  markAllNotificationsAsSeen()().then(() => {
    setAppBadgeCount(0);
  });

  return (
    <ThemedView style={{ flexGrow: 1 }}>
      <TabScreensHeader
        children={
          <View>
            <ThemedText className="text-xl font-bold">
              {t('navigation.notifications')}
            </ThemedText>
          </View>
        }
      />
      <NotificationFeed query={query} />
    </ThemedView>
  );
};
