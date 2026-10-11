import React from 'react';
import { ThemedView } from '../components/ui/themed-view';
import { useOpenpeeps } from '@openpeepshq/react';
import { useSetPageHeader } from '../components/layout';
import { useTranslation } from 'react-i18next';
import {
  NotificationHeaderActions,
  NotificationsList,
} from '../components/notifications/index';
import { useNotificationBadgeReset } from '../hooks/use-notification-badge-reset';

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

  useSetPageHeader(
    t('navigation.notifications'),
    <NotificationHeaderActions />
  );

  return (
    <ThemedView className="grow">
      <NotificationsList
        query={query}
        onRefresh={async () => {
          await Promise.all([query.refetch(), notificationStats.refetch()]);
        }}
      />
    </ThemedView>
  );
};
