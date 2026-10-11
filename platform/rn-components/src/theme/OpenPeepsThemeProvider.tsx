import React, { createContext, useContext, useEffect, useMemo } from 'react';
import { View, useColorScheme as useRNColorScheme } from 'react-native';
import { colorScheme } from 'nativewind';
import { useOpenpeeps } from '@openpeepshq/react';
import { OpenPeepsTheme } from './types';
import { defaultTheme } from './defaults';
import { buildTheme, getThemeVars } from './utils';
import { CommunityConfig, getTheme } from '@openpeepshq/common';

const OpenPeepsThemeContext = createContext<OpenPeepsTheme>(defaultTheme);

export const OpenPeepsThemeProvider = ({
  children,
}: {
  children: React.ReactNode;
}) => {
  const systemColorScheme = useRNColorScheme();
  const { openpeepsApi } = useOpenpeeps();

  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const { data: profileSettings, refetch: refetchProfileSettings } =
    openpeepsApi.useCurrentProfileSettings();

  const resolvedTheme = useMemo(() => {
    const schemeForTheme =
      systemColorScheme === 'dark' || systemColorScheme === 'light'
        ? systemColorScheme
        : undefined;
    return getTheme(
      serverInfo?.communityConfig ??
        ({ theme: { base: 'OpenpeepsDark' } } as CommunityConfig),
      profileSettings,
      schemeForTheme ?? 'light'
    );
  }, [profileSettings, serverInfo?.communityConfig, systemColorScheme]);

  const theme = useMemo(
    () =>
      buildTheme(resolvedTheme.dark, resolvedTheme.primaryHex, () => {
        refetchProfileSettings();
      }),
    [refetchProfileSettings, resolvedTheme.dark, resolvedTheme.primaryHex]
  );

  const themeVars = useMemo(
    () =>
      getThemeVars(theme.colors, {
        buttonRadius: resolvedTheme.buttonRadius,
        radius: resolvedTheme.radius,
      }),
    [
      resolvedTheme.buttonRadius,
      resolvedTheme.radius,
      theme.colors,
    ]
  );

  useEffect(() => {
    // nativewind maps colorScheme.set('system') to Appearance.setColorScheme(null),
    // which crashes on Android RN 0.85 (the native AppearanceModule param is
    // non-null). theme.isDark already resolves the active scheme for the
    // 'system' preference (it derives from the live systemColorScheme above),
    // so always drive nativewind with an explicit value.
    colorScheme.set(theme.isDark ? 'dark' : 'light');
  }, [theme.isDark]);

  return (
    <OpenPeepsThemeContext.Provider value={theme}>
      <View className="flex-1" style={themeVars}>
        {children}
      </View>
    </OpenPeepsThemeContext.Provider>
  );
};

export const useOpenPeepsTheme = () => {
  const context = useContext(OpenPeepsThemeContext);
  if (!context) {
    throw new Error(
      'useOpenPeepsTheme must be used within an OpenPeepsThemeProvider'
    );
  }
  return context;
};
