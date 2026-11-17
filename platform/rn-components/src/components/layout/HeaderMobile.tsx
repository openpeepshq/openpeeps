import React from 'react';
import {
  Platform,
  StatusBar,
  StyleSheet,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { useDrawer } from '../../contexts/drawer-context';
import { useWindowSize } from '../../hooks/index';
import { BASE_URL, isProduction } from '../../lib/constants';
import { toAbsoluteMediaUrl } from '../../lib/media-url';
import { getTheme } from '@openpeepshq/common';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';
import { SvgImage } from '../ui/svg-image';
import { MenuIcon, MessageSquareTextIcon, UserIcon } from '../icons/index';
import type { MainStackParamList } from '../navigation/types/index';

/**
 * Mobile app bar, mirroring the web `HeaderMobile` (slim single row:
 * avatar drawer trigger / small logo / messages shortcut, no theme
 * background). Hidden on tablet widths, matching web's `md:hidden`.
 */
export const HeaderMobile = () => {
  const { t } = useTranslation();
  const { openDrawer } = useDrawer();
  const { isMediumScreenOrLarger } = useWindowSize();
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const { data: profileSettings } = openpeepsApi.useCurrentProfileSettings();

  const menuLabel = t('navigation.openMenu', { defaultValue: 'Open menu' });
  const messagesLabel = t('navigation.openMessages', {
    defaultValue: 'Open messages',
  });

  // Mirrors web HeaderMobile: resolve branding per active theme mode. The
  // system scheme must come from RN: getTheme's default cannot read it.
  const systemColorScheme = useColorScheme();
  const systemScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
  const resolvedTheme = serverInfo
    ? getTheme(serverInfo.communityConfig, profileSettings, systemScheme)
    : undefined;
  const logoUri = toAbsoluteMediaUrl(resolvedTheme?.logoSmall);

  if (isMediumScreenOrLarger) {
    return null;
  }

  return (
    <View style={styles.header} className="bg-background">
      <SafeAreaView edges={['top']} className="px-4 py-2">
        {!isProduction && (
          <View className="mb-2 w-full rounded-lg bg-white/50 p-2">
            <ThemedText className="text-center text-destructive">
              Test Backend ({BASE_URL})
            </ThemedText>
          </View>
        )}
        <View className="flex-row items-center justify-between">
          <Button
            variant="ghost"
            size="icon"
            onPress={openDrawer}
            accessibilityLabel={menuLabel}
            className="native:px-0 active:bg-none"
          >
            {currentProfile?.avatar ? (
              <Avatar alt={currentProfile.displayName || 'Profile'}>
                <AvatarImage source={{ uri: currentProfile.avatar }} />
              </Avatar>
            ) : currentProfile ? (
              <Avatar alt={currentProfile.displayName || 'Profile'}>
                <AvatarFallback className="bg-muted">
                  <UserIcon size={20} className="text-muted-foreground" />
                </AvatarFallback>
              </Avatar>
            ) : (
              <MenuIcon size={24} className="text-foreground" />
            )}
          </Button>
          {logoUri ? (
            <Button
              variant="ghost"
              onPress={() =>
                navigation.navigate('TabNavigator', { screen: 'Home' })
              }
              accessibilityLabel={t('navigation.home', {
                defaultValue: 'Home',
              })}
              // Pin the button height to the 40px icon-row (the default
              // size variant is 48px tall on native) so the slim app bar
              // matches web's single-row height.
              className="native:h-10 native:px-4 active:bg-none"
            >
              <SvgImage uri={logoUri} className="h-6 w-36" />
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="icon"
            onPress={() =>
              navigation.navigate('TabNavigator', { screen: 'Messages' })
            }
            accessibilityLabel={messagesLabel}
            className="native:px-0 active:bg-none"
          >
            <MessageSquareTextIcon
              className="text-muted-foreground"
              size={18}
            />
          </Button>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
