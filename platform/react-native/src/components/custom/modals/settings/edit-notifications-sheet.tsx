import {ActivityIndicator, View} from 'react-native';
import React, {forwardRef, useEffect} from 'react';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {BaseSheet, SheetFooter} from '../common';
import {ThemedText} from '~/components/ui/themed-text';
import {Switch} from '~/components/ui/switch';
import {
  NotificationType,
  ProfileNotificationSettings,
  ProfileSettings,
} from '@openpeeps/common';
import {useOpenpeeps} from '@openpeeps/react';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import {notificationDefaults} from '@openpeeps/common';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface EditNotificationsSheetProps {
  name: string;
  label: string;
  description: string;
  notificationType: NotificationType;
}

export const EditNotificationsSheet = forwardRef<
  BottomSheetModal,
  EditNotificationsSheetProps
>(({name, label, description, notificationType}, ref) => {
  const {openpeepsApi} = useOpenpeeps();
  const {
    data: profileSettings,
    isLoading: isProfileSettingsLoading,
    refetch: refetchProfileSettings,
  } = openpeepsApi.useCurrentProfileSettings();

  const updateCurrentProfileSettings =
    openpeepsApi.updateCurrentProfileSettingsAction();
  const [isInAppEnabled, setIsInAppEnabled] = React.useState(false);
  const [isPushEnabled, setIsPushEnabled] = React.useState(false);
  const [isEmailEnabled, setIsEmailEnabled] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const {t} = useTranslation();

  useEffect(() => {
    const defaults = {
      ...notificationDefaults,
      ...(notificationType.defaultSettings ?? {}),
    };

    const saved: Partial<ProfileNotificationSettings> =
      profileSettings?.notifications?.[name] ?? {};

    setIsInAppEnabled(saved.create ?? defaults.create);
    setIsPushEnabled(saved.push ?? defaults.push);
    setIsEmailEnabled(saved.email ?? defaults.email);
  }, [profileSettings, name, notificationType]);

  const save = async () => {
    setIsLoading(true);
    if (!profileSettings) {
      setIsLoading(false);
      return;
    }

    const updatedSettings = {
      ...profileSettings?.notifications,
      [name]: {
        ...(profileSettings?.notifications?.[name] ?? {}),
        email: isEmailEnabled,
        push: isPushEnabled,
        create: isInAppEnabled,
      },
    };

    const tempSettings: ProfileSettings = {
      ...profileSettings,
      notifications: updatedSettings,
    };

    await updateCurrentProfileSettings(tempSettings)
      .then(async response => {
        if (response) {
          await refetchProfileSettings();
          Toast.show({
            type: 'success',
            text1: t('common.actions.success'),
            text2: t('settings.notifications.updateSuccess', {
              defaultValue: 'Community settings updated',
            }),
          });
        }
      })
      .catch(err => {
        Toast.show({
          type: 'error',
          text1: t('common.errors.error'),
          text2: err.message,
        });
      })
      .finally(() => {
        setIsLoading(false);
        bottomSheetClose(ref);
      });
  };

  return (
    <BaseSheet ref={ref} key={name}>
      <View className="flex-1 p-4">
        <View className="w-full">
          <ThemedText className="text-center text-xl font-semibold mb-6">
            {label}
          </ThemedText>
          <ThemedText className="text-center text-base mb-3">
            {description}
          </ThemedText>
        </View>
        <View className="flex-row items-center justify-between mb-4">
          <ThemedText className="text-base font-semibold">
            {t('settings.notifications.inApp', {
              defaultValue: 'In-App Notifications',
            })}
          </ThemedText>
          {isProfileSettingsLoading ? (
            <ActivityIndicator size={'small'} />
          ) : (
            <Switch
              disabled={isProfileSettingsLoading}
              checked={isInAppEnabled}
              onCheckedChange={checked => {
                setIsInAppEnabled(checked);
              }}
            />
          )}
        </View>
        <View className="flex-row items-center justify-between mb-4">
          <ThemedText className="text-base font-semibold">
            {t('settings.notifications.push', {
              defaultValue: 'Push Notifications',
            })}
          </ThemedText>
          {isProfileSettingsLoading ? (
            <ActivityIndicator size={'small'} />
          ) : (
            <Switch
              disabled={isProfileSettingsLoading}
              checked={isPushEnabled}
              onCheckedChange={checked => {
                setIsPushEnabled(checked);
              }}
            />
          )}
        </View>
        <View className="flex-row items-center justify-between mb-4">
          <ThemedText className="text-base font-semibold">
            {t('settings.notifications.email', {
              defaultValue: 'Email Notifications',
            })}
          </ThemedText>
          {isProfileSettingsLoading ? (
            <ActivityIndicator size={'small'} />
          ) : (
            <Switch
              disabled={isProfileSettingsLoading}
              checked={isEmailEnabled}
              onCheckedChange={checked => {
                setIsEmailEnabled(checked);
              }}
            />
          )}
        </View>

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={save}
          disabled={isLoading}
          confirmText={
            isLoading ? t('common.form.loading') : t('common.form.save')
          }
          variant="destructive"
        />
      </View>
    </BaseSheet>
  );
});
