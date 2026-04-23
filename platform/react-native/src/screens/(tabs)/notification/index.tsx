import React, { useState } from 'react';
import { TabScreensHeader } from '~/components/custom';
import { ThemedView } from '~/components/ui/themed-view';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { ThemedText } from '~/components/ui/themed-text';
import { View } from 'react-native';
import { useOpenpeeps } from '@openpeeps/react';
import { useTranslation } from 'react-i18next';
import { NotificationFeed } from '~/components/custom/notification/NotificationFeed';
import { setAppBadgeCount } from '~/lib/notification-helpers';

export const Notifications = () => {
  const [tabValue, setTabValue] = useState('all');
  const { openpeepsApi } = useOpenpeeps();
  const { t } = useTranslation();
  const query = openpeepsApi.useCurrentProfileNotifications({
    limit: 15,
  });

  const markAllNotificationsAsSeen = openpeepsApi.markAllNotificationsAsSeenAction();

  markAllNotificationsAsSeen()().then(() => {
    setAppBadgeCount(0);
  });

  return (
    <ThemedView style={{ flexGrow: 1 }}>
      <Tabs
        value={tabValue}
        onValueChange={setTabValue}
        className="w-full mx-auto flex-col gap-1.5">
        <TabScreensHeader
          children={
            <View>
              <ThemedText className="text-xl font-bold">
                {t('navigation.notifications')}
              </ThemedText>
              <TabsList className="flex-row w-full bg-transparent border-muted rounded-none border-b p-0 px-3">
                <TabsTrigger
                  value="all"
                  className={`${tabValue === 'all' ? 'border-b-2 border-foreground' : ''
                    }`}>
                  <ThemedText>All</ThemedText>
                </TabsTrigger>
              </TabsList>
            </View>
          }
        />
        <TabsContent value="all" className="w-full p-0">
          <NotificationFeed query={query} />
        </TabsContent>
      </Tabs>
    </ThemedView>
  );
};
