import React from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { markCachedNotificationsSeen, useOpenpeeps } from '@openpeepshq/react';
import { CheckCheckIcon, Settings2Icon } from '../icons/index';
import { MainStackParamList } from '../navigation/types/index';
import { Button } from '../ui/button';

export const NotificationHeaderActions = () => {
  const { t } = useTranslation();
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const markAllNotificationsAsSeen =
    openpeepsApi.markAllNotificationsAsSeenAction()();

  const markAllRead = async () => {
    try {
      await markAllNotificationsAsSeen();
      markCachedNotificationsSeen(queryClient);
      Toast.show({
        type: 'success',
        text1: t('settings.notifications.markAllReadSuccess'),
      });
    } catch {
      Toast.show({ type: 'error', text1: t('notification.markAllReadError') });
    }
  };

  return (
    <View className="flex-row gap-x-2">
      <Button
        size="icon"
        variant="outline"
        accessibilityLabel={t(
          'settings.notifications.feedPreferences.markAllRead'
        )}
        onPress={() => void markAllRead()}
      >
        <CheckCheckIcon size={18} className="text-foreground" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        accessibilityLabel={t('settings.notifications.headerPreferencesTitle')}
        onPress={() => navigation.navigate('NotificationsSettings')}
      >
        <Settings2Icon size={18} className="text-foreground" />
      </Button>
    </View>
  );
};
