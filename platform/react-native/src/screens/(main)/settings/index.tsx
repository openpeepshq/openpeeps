import React from 'react';
import {
  MainStackParamList,
  TabStackParamList,
} from '~/components/navigation/types';
import { ThemedView } from '~/components/ui/themed-view';
import { ThemedText } from '~/components/ui/themed-text';
import { Pressable, View } from 'react-native';
import { TabScreensHeader } from '~/components/custom';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useOpenpeeps } from '@openpeeps/react';
import { ChevronRightIcon } from '~/components/icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

type SettingsItem = {
  title: string;
  description: string;
  route: keyof MainStackParamList;
  params?: {
    screen?: keyof TabStackParamList;
    handle?: string;
    id?: string;
  };
};
export const Settings = ({ }: NativeStackScreenProps<
  TabStackParamList,
  'Settings'
>) => {
  const { currentProfile } = useOpenpeeps();
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const settingsPages: SettingsItem[] = [
    {
      title: 'Profile',
      description: t('settings.profile.description'),
      route: 'EditProfile',
      params: {
        handle: currentProfile?.handle,
      },
    },
    {
      title: 'Account',
      description: t('settings.account.description'),
      route: 'AccountSettings',
    },
    {
      title: 'Notifications',
      description: t('settings.notifications.description'),
      route: 'NotificationsSettings',
    },
    {
      title: 'Theme',
      description: t('settings.theme.description'),
      route: 'ThemeSettings',
    },
  ];

  const handleNavigation = ({
    route,
    params,
  }: Pick<SettingsItem, 'route' | 'params'>) => {
    switch (route) {
      case 'EditProfile': {
        const h = params?.handle;
        if (h) {
          navigation.navigate('EditProfile', { handle: h });
        }
        break;
      }
      case 'AccountSettings':
        navigation.navigate('AccountSettings');
        break;
      case 'NotificationsSettings':
        navigation.navigate('NotificationsSettings');
        break;
      case 'ThemeSettings':
        navigation.navigate('ThemeSettings');
        break;
      default:
        break;
    }
  };
  return (
    <ThemedView className="flex-1 relative">
      <TabScreensHeader
        children={
          <View className="p-2">
            <ThemedText className="text-2xl font-semibold">Settings</ThemedText>
          </View>
        }
      />
      <View style={{ flexGrow: 1 }} className=" p-4">
        <ThemedText className="text-xl text-muted-foreground">
          Manage all settings relating to your acccount here:{' '}
        </ThemedText>

        <View className="mt-8" />
        {settingsPages.map((item, index) => (
          <Pressable
            key={index}
            onPress={() => {
              handleNavigation({
                route: item.route,
                params: item.params,
              });
            }}
            className="py-2 mb-2 flex-row justify-between items-center gap-x-4">
            <View className="flex-1">
              <ThemedText className="text-lg font-semibold">
                {item.title}
              </ThemedText>
              <ThemedText className="text-muted-foreground">
                {item.description}
              </ThemedText>
            </View>
            <View className="flex-row items-center justify-center h-full">
              <ChevronRightIcon className="text-foreground" />
            </View>
          </Pressable>
        ))}
      </View>
    </ThemedView>
  );
};
