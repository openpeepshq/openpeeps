import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { RootStackParamList, ROOT_ROUTES } from './types';
import { AuthNavigator } from './auth-navigator';
import { useOpenpeeps } from '@openpeepshq/react';
import { MainNavigator } from './main-navigator';
import { useAppImagesStore } from '../../stores/useAppImagesStore';
import { fetchCachedMedia } from '../../utils/media-cache';
import { getTheme } from '@openpeepshq/common';
import { ActivityIndicator, Image, View } from 'react-native';
import { toAbsoluteMediaUrl } from '../../lib/media-url';

const RootStack = createNativeStackNavigator<RootStackParamList>();

export const Navigation = () => {
  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const { setBackground, setLogoSmall } = useAppImagesStore();
  const [authBrandingReady, setAuthBrandingReady] = React.useState(false);
  const {
    data: serverInfo,
    status: serverInfoStatus,
    isError: serverInfoIsError,
    isFetched: serverInfoIsFetched,
  } = openpeepsApi.useServerInfo();
  const { data: profileSettings } = openpeepsApi.useCurrentProfileSettings();

  const setDefaultTheme = React.useCallback(async () => {
    if (!serverInfo) {
      return;
    }
    const resolvedTheme = getTheme(serverInfo.communityConfig, profileSettings);
    const backgroundSource =
      resolvedTheme.background || resolvedTheme.backgroundAuth;
    const logoSource = resolvedTheme.logoSmall;

    if (backgroundSource) {
      const background = await fetchCachedMedia(
        backgroundSource,
        'image',
      );
      if (background) {
        setBackground(background);
      }
    }

    if (logoSource) {
      const logo = await fetchCachedMedia(
        logoSource,
        'image',
      );
      if (logo) {
        setLogoSmall(logo);
      }
    }
  }, [serverInfo, setBackground, setLogoSmall]);

  React.useEffect(() => {
    if (!serverInfo?.communityConfig.theme) {
      return;
    }
    if (!currentProfile) {
      return;
    }
    setDefaultTheme();
  }, [serverInfo, currentProfile, setDefaultTheme]);

  React.useEffect(() => {
    if (currentProfile) {
      setAuthBrandingReady(true);
      return;
    }
    if (!serverInfo || serverInfoStatus !== 'success') {
      setAuthBrandingReady(false);
      return;
    }

    const resolvedTheme = getTheme(serverInfo.communityConfig);
    const authBackgroundUrl = toAbsoluteMediaUrl(
      resolvedTheme.backgroundAuth || serverInfo.communityConfig?.theme?.backgroundAuth,
    );

    if (!authBackgroundUrl) {
      setAuthBrandingReady(true);
      return;
    }

    setAuthBrandingReady(false);

    let cancelled = false;
    Image.prefetch(authBackgroundUrl)
      .then(() => {
        if (cancelled) {
          return;
        }
        setAuthBrandingReady(true);
      })
      .catch(() => {
        if (cancelled) {
          return;
        }
        setAuthBrandingReady(true);
      });

    return () => {
      cancelled = true;
    };
  }, [currentProfile, serverInfo, serverInfoStatus]);

  // Wait for server info only on the *initial* load (!isFetched). After any attempt
  // (success or error), isFetched is true, so a refetch in "pending" must not
  // re-enable the full-screen gate — that was unmounting auth and retriggering
  // useServerInfo observers in a loop.
  const shouldWaitForServerInfoBeforeAuth =
    !currentProfile &&
    !serverInfoIsError &&
    ((serverInfoStatus === 'success' && !authBrandingReady) ||
      (!serverInfoIsFetched && serverInfoStatus === 'pending'));

  if (shouldWaitForServerInfoBeforeAuth) {
    return (
      <View className="flex-1 items-center justify-center bg-background">
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <RootStack.Navigator
      screenOptions={{ headerShown: false, animation: 'fade' }}>
      {currentProfile ? (
        <RootStack.Screen name={ROOT_ROUTES.MAIN} component={MainNavigator} />
      ) : (
        <RootStack.Screen name={ROOT_ROUTES.AUTH} component={AuthNavigator} />
      )}
    </RootStack.Navigator>
  );
};
