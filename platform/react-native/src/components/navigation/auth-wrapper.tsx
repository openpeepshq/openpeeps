import { useOpenpeeps } from '@openpeeps/react';
import React from 'react';

import { Image, ImageBackground, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { ThemedText } from '../ui/themed-text';
import { isProduction } from '../../lib/constants';
import { BASE_URL } from '../../lib/constants';
import { useWindowSize } from '../../hooks';
import { getTheme } from '@openpeeps/common';
import { toAbsoluteMediaUrl } from '../../lib/media-url';

const DevBanner = () =>
  !isProduction && (
    <View className="absolute bg-white/80 z-10 ml-8 mr-8 w-auto top-64 p-4 rounded-lg">
      <ThemedText className="text-red-800 text-center">
        Test Backend ({BASE_URL})
      </ThemedText>
    </View>
  ) || null;

const Logo = () => {
  return (
    <Image
      source={require('../../assets/images/logo.webp')}
      className="absolute z-10  top-16 left-2 max-w-fit w-[206px] h-[26px]"
      resizeMode="contain"
    />
  );
};

const AuthImage = ({ children }: { children?: React.ReactNode }) => {

  const { openpeepsApi } = useOpenpeeps();
  const {
    data: serverInfo,
    isLoading,
  } = openpeepsApi.useServerInfo();
  const themedBackgroundUri = serverInfo
    ? getTheme(serverInfo.communityConfig).backgroundAuth
    : undefined;
  const authBackgroundUri =
    themedBackgroundUri ||
    serverInfo?.communityConfig?.theme?.backgroundAuth;
  const resolvedAuthBackgroundUri = toAbsoluteMediaUrl(authBackgroundUri);

  return (
    <ImageBackground
      source={
        resolvedAuthBackgroundUri && !isLoading
          ? { uri: resolvedAuthBackgroundUri }
          : require('../../assets/images/black-ambition-2025-hero.png')
      }
      className="w-full justify-end flex-1">
      <Logo />
      <DevBanner />
      {children}
    </ImageBackground>

  );
};


const NarrowAuthWrapper = ({ children }: { children: React.ReactNode }) => {
  return (
    <AuthImage>
      <View className="px-2 pt-4 w-full bg-background min-h-[400px] pb-10">
        {children}
      </View>

    </AuthImage>
  );
};

const WideAuthWrapper = ({ children }: { children: React.ReactNode }) => {

  return (
    <View className="flex flex-1 flex-row">
      <View className="flex-1">
        <AuthImage />
      </View>
      <View className="flex flex-1 justify-center p-6">
        {children}
      </View>
    </View>
  );
};

export const AuthWrapper = ({ children }: { children: React.ReactNode }) => {

  const { isMediumScreenOrLarger } = useWindowSize();

  return (
    <KeyboardAwareScrollView
      contentContainerStyle={{ flexGrow: 1 }}
      className="w-full flex bg-background">
      {isMediumScreenOrLarger ?
        <WideAuthWrapper>{children}</WideAuthWrapper> :
        <NarrowAuthWrapper>{children}</NarrowAuthWrapper>
      }
    </KeyboardAwareScrollView>
  );
};

