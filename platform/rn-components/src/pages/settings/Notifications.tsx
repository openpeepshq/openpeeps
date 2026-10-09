import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { GenericHeader } from '../../components/custom/index';
import { ConfigMenuButton } from '../../components/configuration/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';

type NotificationSettingsProps = MainScreenProps<'NotificationSettings'>;

export const NotificationSettings: React.FC<NotificationSettingsProps> = ({
  navigation,
}) => {
  const { t } = useTranslation();

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('settings.notifications.title', {
          defaultValue: 'Notifications',
        })}
      />
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
    </ThemedSafeAreaView>
  );
};
