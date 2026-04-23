import React, { createContext, useContext, useMemo } from 'react';
import { View, useColorScheme as useRNColorScheme } from 'react-native';
import { vars } from 'nativewind';
import { useOpenpeeps } from '@openpeeps/react';
import { OpenPeepsTheme } from './types';
import { defaultTheme } from './defaults';
import { buildTheme } from './utils';
import { CommunityConfig, getTheme } from '@openpeeps/common';

const OpenPeepsThemeContext = createContext<OpenPeepsTheme>(defaultTheme);

export const OpenPeepsThemeProvider = ({ children }: { children: React.ReactNode }) => {

  const systemColorScheme = useRNColorScheme();
  const { openpeepsApi } = useOpenpeeps();

  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const profileSettingsQuery = openpeepsApi.useCurrentProfileSettings();
  const { data: profileSettings } = profileSettingsQuery;

  const theme = useMemo(() => {
    const schemeForTheme =
      systemColorScheme === 'dark' || systemColorScheme === 'light'
        ? systemColorScheme
        : undefined;
    const userTheme = getTheme(
      serverInfo?.communityConfig ?? { theme: { base: 'OpenpeepsDark' } } as CommunityConfig,
      profileSettings,
      schemeForTheme ?? 'light'
    );
    return buildTheme(userTheme.dark, userTheme.primaryHex, () => { profileSettingsQuery.refetch() });
  }, [profileSettings?.theme, serverInfo?.communityConfig, systemColorScheme]);

  const themeVars = useMemo(() =>
    vars(
      Object.fromEntries(
        Object.entries(theme.colors).map(
          ([key, value]) => [`--${key}`, value]
        ))),
    [theme]
  );

  return (
    <OpenPeepsThemeContext.Provider
      value={theme}>
      <View className="flex-1" style={themeVars}>
        {children}
      </View>
    </OpenPeepsThemeContext.Provider>
  );
};

export const useOpenPeepsTheme = () => {
  const context = useContext(OpenPeepsThemeContext);
  if (!context) {
    throw new Error('useOpenPeepsTheme must be used within an OpenPeepsThemeProvider');
  }
  return context;
};
