import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useSetPageHeader } from '../../components/layout';
import { ConfigMenuButton } from '../../components/configuration/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ThemedView } from '../../components/ui/themed-view';

type NotificationSettingsProps = MainScreenProps<'NotificationSettings'>;

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();

  useSetPageHeader(
    t('settings.notifications.title', {
      defaultValue: 'Notifications',
    })
  );

  return (
    <ThemedView className="flex-1">
      <View className="p-4">
        <ConfigMenuButton
          translationPrefix="settings.notifications.preferences"
          onPress={() => navigation.navigate('NotificationsSettings')}
        />
        <ConfigMenuButton
          translationPrefix="settings.notifications.pushEnabledDevices"
          onPress={() => navigation.navigate('PushEnabledDevices')}
        />
      </View>
    </ThemedView>
  );
};
