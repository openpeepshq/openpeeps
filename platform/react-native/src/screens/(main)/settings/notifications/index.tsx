import {MainScreenProps} from '~/components/navigation/types';
import {EditNotificationsSheet, GenericHeader} from '~/components/custom';
import {KeyboardAwareScrollView} from 'react-native-keyboard-aware-scroll-view';
import {Pressable, View} from 'react-native';
import {useTranslation} from 'react-i18next';
import {ThemedSafeAreaView} from '~/components/ui/themed-safe-area-view';
import React, {useCallback, useRef} from 'react';
import {ThemedText} from '~/components/ui/themed-text';
import {ThemedView} from '~/components/ui/themed-view';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ChevronRightIcon} from '~/components/icons';
import {useOpenpeeps} from '@openpeeps/react';
import {NotificationType} from '@openpeeps/common';

const notificationTypeDefaults: Record<
  string,
  {label: string; description: string}
> = {
  directMessage: {
    label: 'Direct Messages',
    description: 'Manage notifications for when you receive a direct message',
  },
  mention: {
    label: 'Mentions',
    description: 'Receive a notification when someone mentions you in a post',
  },
};

type NotificationsSettingsProps = MainScreenProps<'NotificationsSettings'>;

export const NotificationsSettings: React.FC<
  NotificationsSettingsProps
> = ({}) => {
  const {t} = useTranslation();
  const {openpeepsApi} = useOpenpeeps();
  const notificationTypes = openpeepsApi.useCurrentProfileNotificationTypes();

  return (
    <ThemedSafeAreaView style={{flex: 1}}>
      <GenericHeader
        title={t('settings.notifications.title', {
          defaultValue: 'Notification Settings',
        })}
      />
      <KeyboardAwareScrollView
        contentContainerStyle={{flexGrow: 1}}
        className="w-full flex py-3 px-5">
        <ThemedView style={{flex: 1}}>
          <KeyboardAwareScrollView
            contentContainerStyle={{flexGrow: 1}}
            className="w-full flex py-3 px-5">
            <ThemedText className="text-lg text-muted-foreground">
              {t('settings.notifications.description', {
                defaultValue: 'Manage your notification preferences',
              })}
            </ThemedText>

            <ThemedView className=" gap-7 py-4 w-full  items-center rounded-md">
              {notificationTypes.data &&
                notificationTypes.data.map((item, index) => (
                  <NotificationItem
                    key={index}
                    name={item.type}
                    label={t(`settings.notifications.types.${item.type}.label`, {
                      defaultValue:
                        notificationTypeDefaults[item.type]?.label ??
                        item.type,
                    })}
                    description={t(
                      `settings.notifications.types.${item.type}.description`,
                      {
                        defaultValue:
                          notificationTypeDefaults[item.type]?.description ??
                          '',
                      },
                    )}
                    notificationType={item}
                  />
                ))}
            </ThemedView>
          </KeyboardAwareScrollView>
        </ThemedView>
      </KeyboardAwareScrollView>
    </ThemedSafeAreaView>
  );
};

interface NotificationItemProps {
  name: string;
  label: string;
  description: string;
  notificationType: NotificationType;
}

const NotificationItem = ({
  name,
  label,
  description,
  notificationType,
}: NotificationItemProps) => {
  const notificationPickerModalRef = useRef<BottomSheetModal>(null);

  const handleNotificationModalPress = useCallback(() => {
    notificationPickerModalRef.current?.present();
  }, []);

  return (
    <>
      <Pressable
        onPress={handleNotificationModalPress}
        className="py-2 mb-2 flex-row justify-between items-center gap-x-4">
        <View className="flex-1">
          <ThemedText className="text-lg font-semibold">{label}</ThemedText>
          <ThemedText className="text-muted-foreground">
            {description}
          </ThemedText>
        </View>
        <View className="flex-row items-center justify-center h-full">
          <ChevronRightIcon className="text-foreground" />
        </View>
      </Pressable>
      <EditNotificationsSheet
        ref={notificationPickerModalRef}
        name={name}
        label={label}
        description={description}
        notificationType={notificationType}
      />
    </>
  );
};
