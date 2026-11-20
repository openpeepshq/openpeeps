import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { NotificationType } from '@openpeepshq/common';
import {
  markCachedNotificationsSeen,
  useNotificationFeedFilter,
  useOpenpeeps,
} from '@openpeepshq/react';
import {
  CheckCheckIcon,
  Settings2Icon,
  SlidersHorizontalIcon,
} from '../icons/index';
import { MainStackParamList } from '../navigation/types/index';
import { Button } from '../ui/button';
import {
  BottomSheet,
  BottomSheetContent,
  BottomSheetFlatList,
  BottomSheetHeader,
  useBottomSheet,
} from '../ui/bottom-sheet';
import { Checkbox } from '../ui/checkbox';
import { ThemedText } from '../ui/themed-text';

export const NotificationHeaderActions = () => {
  const { t } = useTranslation();
  const { openpeepsApi, queryClient } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const filter = useNotificationFeedFilter();
  const filterSheet = useBottomSheet();
  const markAllNotificationsAsSeen =
    openpeepsApi.markAllNotificationsAsSeenAction()();

  const markAllRead = async () => {
    try {
      // Cover only what is visible under the active filter; hidden types are
      // left untouched (the feed never shows them, so they can't be "read").
      // The first arg is the (absent) path-params slot.
      await markAllNotificationsAsSeen(
        undefined,
        filter.hasFilter ? { excludeTypes: filter.excludeTypes } : undefined
      );
      markCachedNotificationsSeen(queryClient);
      Toast.show({
        type: 'success',
        text1: t('settings.notifications.markAllReadSuccess'),
      });
    } catch {
      Toast.show({ type: 'error', text1: t('notification.markAllReadError') });
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
        onPress={filterSheet.open}
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

      <BottomSheet>
        <BottomSheetContent ref={filterSheet.ref} snapPoints={['70%']}>
          <BottomSheetHeader className="border-b-0">
            <ThemedText className="text-base font-semibold">
              {filterTitle}
            </ThemedText>
          </BottomSheetHeader>
          <BottomSheetFlatList
            className="py-0"
            contentContainerStyle={{ paddingVertical: 0 }}
            data={filter.types}
            keyExtractor={(nt) => (nt as NotificationType).type}
            renderItem={({ item }) => {
              const nt = item as NotificationType;
              return (
                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: !filter.isHidden(nt.type) }}
                  onPress={() => void filter.toggle(nt.type)}
                  className="flex-row items-center gap-2 py-2"
                >
                  <Checkbox
                    checked={!filter.isHidden(nt.type)}
                    // The row is the toggle; the checkbox is display-only.
                    pointerEvents="none"
                    onCheckedChange={() => {}}
                  />
                  <ThemedText className="flex-1">
                    {t(`settings.notifications.types.${nt.type}.label`, {
                      defaultValue: nt.type,
                    })}
                  </ThemedText>
                </Pressable>
              );
            }}
            ListFooterComponent={
              filter.hasFilter ? (
                <Pressable
                  onPress={() => void filter.showAll()}
                  className="flex-row items-center py-2"
                >
                  <ThemedText className="text-primary">
                    {t('notification.filter.showAll')}
                  </ThemedText>
                </Pressable>
              ) : null
            }
          />
        </BottomSheetContent>
      </BottomSheet>
    </View>
  );
};
