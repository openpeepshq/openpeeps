import React from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {
  NativeStackNavigationProp,
  NativeStackScreenProps,
} from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { useCurrentProfile } from '@openpeepshq/react';
import {
  MainStackParamList,
  TabStackParamList,
} from '../../components/navigation/types/index';
import { ConfigMenuButton } from '../../components/configuration/index';
import { TabScreensHeader } from '../../components/custom/index';
import { ThemedText } from '../../components/ui/themed-text';
import { ThemedView } from '../../components/ui/themed-view';

export const Settings = ({}: NativeStackScreenProps<
  TabStackParamList,
  'Settings'
>) => {
  const profile = useCurrentProfile();
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <ThemedView className="flex-1 relative">
      <TabScreensHeader
        children={
          <View className="p-2">
            <ThemedText className="text-2xl font-semibold">
              {t('settings.menu')}
            </ThemedText>
          </View>
        }
      />
      <View className="grow p-4">
        {profile ? (
          <ConfigMenuButton
            translationPrefix="settings.publicProfile"
            onPress={() =>
              navigation.navigate('EditProfile', { handle: profile.handle })
            }
          />
        ) : null}
        <ConfigMenuButton
          translationPrefix="settings.account"
          onPress={() => navigation.navigate('AccountSettings')}
        />
        <ConfigMenuButton
          translationPrefix="settings.blocked"
          onPress={() => navigation.navigate('BlockedSettings')}
        />
        <ConfigMenuButton
          translationPrefix="settings.notifications"
          onPress={() => navigation.navigate('NotificationSettings')}
        />
        <ConfigMenuButton
          translationPrefix="settings.accessTokens"
          onPress={() => navigation.navigate('AccessTokensSettings')}
        />
        <ConfigMenuButton
          translationPrefix="settings.theme"
          onPress={() => navigation.navigate('ThemeSettings')}
        />
        <ConfigMenuButton
          translationPrefix="settings.language"
          onPress={() => navigation.navigate('LanguageSettings')}
        />
        <ConfigMenuButton
          translationPrefix="settings.timezone"
          onPress={() => navigation.navigate('TimezoneSettings')}
        />
        <ConfigMenuButton
          translationPrefix="settings.feed"
          onPress={() => navigation.navigate('FeedSettings')}
        />
      </View>
    </ThemedView>
  );
};
