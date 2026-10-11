import React, { type ReactNode } from 'react';
import { Image, ImageBackground, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { getTheme } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { useWindowSize } from '../../hooks/index';
import { BASE_URL, isProduction } from '../../lib/constants';
import { toAbsoluteMediaUrl } from '../../lib/media-url';
import { ThemedText } from '../ui/themed-text';

export interface AuthLayoutProps {
  children?: ReactNode;
  description?: ReactNode;
  noRedirect?: boolean;
}

const DevBanner = () =>
  !isProduction ? (
    <View className="absolute top-64 z-10 ml-8 mr-8 w-auto rounded-lg bg-white/80 p-4">
      <ThemedText className="text-center text-destructive">
        Test Backend ({BASE_URL})
      </ThemedText>
    </View>
  ) : null;

const Logo = ({ uri }: { uri?: string }) => {
  if (!uri) return null;
  return (
    <Image
      source={{ uri }}
      className="absolute left-2 top-16 z-10 h-[26px] w-[206px] max-w-fit"
      resizeMode="contain"
    />
  );
};

const AuthImage = ({ children }: { children?: ReactNode }) => {
  const { openpeepsApi } = useOpenpeeps();
  const { data: serverInfo, isLoading } = openpeepsApi.useServerInfo();
  const resolvedTheme = serverInfo
    ? getTheme(serverInfo.communityConfig)
    : undefined;
  const authBackgroundUri = toAbsoluteMediaUrl(resolvedTheme?.backgroundAuth);
  const resolvedLogoUri = toAbsoluteMediaUrl(resolvedTheme?.logoSmall);

  const content = (
    <>
      <Logo uri={resolvedLogoUri} />
      <DevBanner />
      {children}
    </>
  );

  if (authBackgroundUri && !isLoading) {
    return (
      <ImageBackground
        source={{ uri: authBackgroundUri }}
        className="w-full flex-1 justify-end"
      >
        {content}
      </ImageBackground>
    );
  }

  return (
    <View className="bg-background w-full flex-1 justify-end">{content}</View>
  );
};

const NarrowAuthLayout = ({
  children,
  description,
}: {
  children?: ReactNode;
  description?: ReactNode;
}) => (
  <AuthImage>
    <View className="bg-background w-full min-h-[400px] px-2 pb-10 pt-4">
      {description}
      {children}
    </View>
  </AuthImage>
);

const WideAuthLayout = ({
  children,
  description,
}: {
  children?: ReactNode;
  description?: ReactNode;
}) => (
  <View className="flex flex-1 flex-row">
    <View className="flex-1">
      <AuthImage />
    </View>
    <View className="flex flex-1 justify-center p-6">
      {description}
      {children}
    </View>
  </View>
);

export const AuthLayout = ({ children, description }: AuthLayoutProps) => {
  const { isMediumScreenOrLarger } = useWindowSize();

  return (
    <KeyboardAwareScrollView
      contentContainerClassName="grow"
      className="bg-background flex w-full"
    >
      {isMediumScreenOrLarger ? (
        <WideAuthLayout description={description}>{children}</WideAuthLayout>
      ) : (
        <NarrowAuthLayout description={description}>
          {children}
        </NarrowAuthLayout>
      )}
    </KeyboardAwareScrollView>
  );
};
