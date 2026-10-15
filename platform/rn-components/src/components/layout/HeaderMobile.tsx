import React from 'react';
import {
  Image,
  ImageBackground,
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
import { useDrawer } from '../../contexts/drawer-context';
import { useWindowSize } from '../../hooks/index';
import { BASE_URL, isProduction } from '../../lib/constants';
import { toAbsoluteMediaUrl } from '../../lib/media-url';
import { getTheme } from '@openpeepshq/common';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';
import { MessageSquareTextIcon, UserIcon } from '../icons/index';
import type { MainStackParamList } from '../navigation/types/index';

export const HeaderMobile = () => {
  const { openDrawer } = useDrawer();
  const { isMediumScreenOrLarger } = useWindowSize();
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const { data: profileSettings } = openpeepsApi.useCurrentProfileSettings();

  // Mirrors web HeaderMobile: resolve branding per active theme mode. The
  // system scheme must come from RN: getTheme's default cannot read it.
  const systemColorScheme = useColorScheme();
  const systemScheme = systemColorScheme === 'dark' ? 'dark' : 'light';
  const resolvedTheme = serverInfo
    ? getTheme(serverInfo.communityConfig, profileSettings, systemScheme)
    : undefined;
  const logoUri = toAbsoluteMediaUrl(resolvedTheme?.logoSmall);
  const backgroundUri = toAbsoluteMediaUrl(resolvedTheme?.background);

  if (isMediumScreenOrLarger) {
    return null;
  }

  return (
    <ImageBackground
      resizeMode="cover"
      source={backgroundUri ? { uri: backgroundUri } : undefined}
      style={styles.header}
      className="px-4 pb-3"
    >
      <SafeAreaView edges={['top']}>
        {!isProduction && (
          <View className="mb-2 w-full rounded-lg bg-white/50 p-2">
            <ThemedText className="text-center text-destructive">
              Test Backend ({BASE_URL})
            </ThemedText>
          </View>
        )}
        <View className="flex-row items-center justify-between">
          <Button
            variant="outline"
            size="icon"
            onPress={openDrawer}
            className="native:px-0 active:bg-none rounded-full bg-black"
          >
            <Avatar alt={(currentProfile?.displayName as string) || 'Profile'}>
              {currentProfile?.avatar ? (
                <AvatarImage source={{ uri: currentProfile.avatar }} />
              ) : (
                <AvatarFallback className="-bottom-2 -right-2 h-6 w-6 bg-black">
                  <UserIcon size={20} className="text-muted-foreground" />
                </AvatarFallback>
              )}
            </Avatar>
          </Button>
          {logoUri ? (
            <Image
              source={{ uri: logoUri }}
              resizeMode="contain"
              className="h-[64px] w-[216px]"
            />
          ) : null}
          <Button
            variant="outline"
            size="icon"
            onPress={() =>
              navigation.navigate('TabNavigator', { screen: 'Messages' })
            }
            accessibilityLabel="Messages"
          >
            <MessageSquareTextIcon
              className="text-muted-foreground"
              size={18}
            />
          </Button>
        </View>
      </SafeAreaView>
    </ImageBackground>
  );
};

const styles = StyleSheet.create({
  header: {
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0,
  },
});
