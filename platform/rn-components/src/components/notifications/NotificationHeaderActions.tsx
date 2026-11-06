import React from 'react';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  markCachedNotificationsSeen,
  useNotificationFeedFilter,
  useOpenpeeps,
} from '@openpeepshq/react';
import {
  CheckCheckIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
  XIcon,
} from '../icons/index';
import { MainStackParamList } from '../navigation/types/index';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { ThemedText } from '../ui/themed-text';

export const NotificationHeaderActions = () => {
  const { t } = useTranslation();
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const filter = useNotificationFeedFilter();
  const [filterOpen, setFilterOpen] = React.useState(false);
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
      Toast.show({
        type: 'error',
        text1: t('notification.markAllReadError'),
      });
    }
  };

  const filterTitle = t('notification.filter.title');

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
        accessibilityLabel={filterTitle}
        onPress={() => setFilterOpen(true)}
      >
        <SlidersHorizontalIcon size={18} className="text-foreground" />
      </Button>
      <Button
        size="icon"
        variant="outline"
        accessibilityLabel={t('settings.notifications.headerPreferencesTitle')}
        onPress={() => navigation.navigate('NotificationsSettings')}
      >
        <Settings2Icon size={18} className="text-foreground" />
      </Button>

      <Modal
        visible={filterOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setFilterOpen(false)}
      >
        <View className="bg-black/50 flex-1 justify-end">
          <View className="bg-background max-h-[70%] rounded-t-lg px-4 pt-3 pb-6">
            <View className="mb-2 flex-row items-center justify-between">
              <ThemedText className="text-base font-semibold">
                {filterTitle}
              </ThemedText>
              <Button
                size="icon"
                variant="ghost"
                accessibilityLabel={t('common.close')}
                onPress={() => setFilterOpen(false)}
              >
                <XIcon size={20} className="text-foreground" />
              </Button>
            </View>
            <ScrollView>
              {filter.types.map((nt) => (
                <Pressable
                  key={nt.type}
                  onPress={() => void filter.toggle(nt.type)}
                  className="flex-row items-center gap-2 py-2"
                >
                  <Checkbox
                    checked={!filter.isHidden(nt.type)}
                    // The row is the toggle; the checkbox is display-only.
                    onCheckedChange={() => {}}
                  />
                  <ThemedText className="flex-1">
                    {t(`settings.notifications.types.${nt.type}.label`, {
                      defaultValue: nt.type,
                    })}
                  </ThemedText>
                </Pressable>
              ))}
              {filter.hasFilter ? (
                <Pressable
                  onPress={() => void filter.showAll()}
                  className="flex-row items-center py-2"
                >
                  <ThemedText className="text-primary">
                    {t('notification.filter.showAll')}
                  </ThemedText>
                </Pressable>
              ) : null}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
};
