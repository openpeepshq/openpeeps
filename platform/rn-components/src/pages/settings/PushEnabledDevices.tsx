import React from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { getApp } from '@react-native-firebase/app';
import { deleteToken, getToken } from '@react-native-firebase/messaging';
import {
  pushSubscriptionDeviceName,
  pushSubscriptionIsMobile,
} from '@openpeepshq/common/lib';
import { usePushEnabledDevices } from '@openpeepshq/react';
import { GenericHeader } from '../../components/custom/index';
import {
  LaptopIcon,
  SmartphoneIcon,
  Trash2Icon,
} from '../../components/icons/index';
import { MainScreenProps } from '../../components/navigation/types/index';
import { Button } from '../../components/ui/button';
import { Text } from '../../components/ui/text';
import { ThemedSafeAreaView } from '../../components/ui/themed-safe-area-view';
import { ThemedText } from '../../components/ui/themed-text';

type PushEnabledDevicesProps = MainScreenProps<'PushEnabledDevices'>;

export const PushEnabledDevices: React.FC<PushEnabledDevicesProps> = () => {
  const { t } = useTranslation();
  const {
    subscriptions,
    isCurrentSubscription,
    deletingId,
    confirmId,
    setConfirmId,
    status,
    clearStatus,
    remove,
  } = usePushEnabledDevices({
    getCurrentEndpoint: () => getToken(getApp().messaging()),
    unsubscribeCurrent: () => deleteToken(getApp().messaging()),
  });

  React.useEffect(() => {
    if (!status) return;
    Toast.show({ type: status.type, text1: status.message });
    clearStatus();
  }, [status, clearStatus]);

  return (
    <ThemedSafeAreaView className="flex-1">
      <GenericHeader
        title={t('settings.notifications.pushEnabledDevices.title', {
          defaultValue: 'Push-enabled devices',
        })}
      />
      <ScrollView contentContainerClassName="p-4">
        {subscriptions.length === 0 ? (
          <View className="w-full items-center justify-center p-4">
            <ThemedText className="text-lg text-center">
              {t('settings.notifications.pushEnabledDevices.noDevicesFound', {
                defaultValue: 'No push-enabled devices found.',
              })}
            </ThemedText>
          </View>
        ) : (
          <View className="rounded-md border border-border overflow-hidden">
            {subscriptions.map((subscription, index) => {
              const current = isCurrentSubscription(subscription);
              const confirming = confirmId === subscription.id;
              const Icon = pushSubscriptionIsMobile(subscription)
                ? SmartphoneIcon
                : LaptopIcon;

              return (
                <View
                  key={subscription.id}
                  className={`flex-row items-center justify-between p-4 ${
                    index > 0 ? 'border-t border-border' : ''
                  }`}
                >
                  <View className="flex-row items-center gap-x-4 flex-1">
                    <Icon size={20} className="text-muted-foreground" />
                    <View className="flex-1">
                      <View className="flex-row items-center gap-x-2">
                        <ThemedText className="text-sm font-medium">
                          {pushSubscriptionDeviceName(subscription)}
                        </ThemedText>
                        {current ? (
                          <View className="bg-primary rounded-full px-2 py-0.5">
                            <Text className="text-primary-foreground text-[10px] font-bold uppercase">
                              {t('common.thisDevice', {
                                defaultValue: 'This device',
                              })}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                      <ThemedText className="text-muted-foreground text-xs">
                        {subscription.type}
                      </ThemedText>
                    </View>
                  </View>

                  {confirming ? (
                    <View className="flex-row items-center gap-x-2">
                      <Button
                        variant="destructive"
                        size="sm"
                        disabled={deletingId === subscription.id}
                        onPress={() => void remove(subscription)}
                      >
                        <Text>
                          {t(
                            'settings.notifications.pushEnabledDevices.delete.confirm',
                            { defaultValue: 'Delete' }
                          )}
                        </Text>
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onPress={() => setConfirmId(null)}
                      >
                        <Text>
                          {t(
                            'settings.notifications.pushEnabledDevices.delete.cancel',
                            { defaultValue: 'Cancel' }
                          )}
                        </Text>
                      </Button>
                    </View>
                  ) : (
                    <Pressable
                      className="p-2"
                      accessibilityLabel={t('common.actions.delete', {
                        defaultValue: 'Delete',
                      })}
                      onPress={() => setConfirmId(subscription.id)}
                    >
                      <Trash2Icon size={18} className="text-muted-foreground" />
                    </Pressable>
                  )}
                </View>
              );
            })}
          </View>
        )}
      </ScrollView>
    </ThemedSafeAreaView>
  );
};
