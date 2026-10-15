import React, { type ReactNode } from 'react';
import { Image, ImageBackground, Pressable, View } from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useTranslation } from 'react-i18next';
import { getTheme } from '@openpeepshq/common';
import { useCurrentProfile, useOpenpeeps, useRouter } from '@openpeepshq/react';
import { useWindowSize } from '../../hooks/index';
import { BASE_URL, isProduction } from '../../lib/constants';
import { toAbsoluteMediaUrl } from '../../lib/media-url';
import { ProfileAvatar } from '../profile/Avatar';
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
  const router = useRouter();
  if (!uri) return null;
  return (
    <Pressable
      onPress={() => router.navigate({ type: 'home' })}
      hitSlop={24}
      className="absolute left-2 top-16 z-10 h-[26px] w-[206px] max-w-fit"
    >
      <Image
        source={{ uri }}
        className="h-[26px] w-[206px] max-w-fit"
        resizeMode="contain"
      />
    </Pressable>
  );
};

// Mirror web Auth.tsx: on shell-less auth pages (about/code-of-conduct) show a
// signed-in user's avatar and a Go-to-community link so navigation back to the
// app is still available without the side-menu Wrapper.
const SignedInRow = () => {
  const me = useCurrentProfile();
  const router = useRouter();
  const { t } = useTranslation();
  if (!me) return null;
  const name = me.displayName?.trim() || (me.handle ? `@${me.handle}` : '');
  return (
    <View className="flex-row items-center gap-3 px-2 pb-2 pt-1">
      <ProfileAvatar profile={me} className="size-8 border-0" />
      <View>
        <ThemedText className="text-sm text-muted-foreground">
          {t('auth.signedInAs', { name })}
        </ThemedText>
        <Pressable onPress={() => router.navigate({ type: 'home' })}>
          <ThemedText className="text-sm font-medium text-primary">
            {t('auth.goToCommunity')}
          </ThemedText>
        </Pressable>
      </View>
    </View>
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
      <SignedInRow />
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
      <SignedInRow />
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
