import React, { type ReactNode } from 'react';
import { Platform, StatusBar, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ThemedView } from '../ui/themed-view';
import { ContentHeader } from './ContentHeader';
import { HeaderMobile } from './HeaderMobile';
import { PageChromeProvider } from './pageChrome';
import { PlusButton } from './PlusButton';

// HeaderMobile owns the top inset. When a route drops that banner, keep the
// status bar and notch clear of the content header. Android often reports a
// 0 top inset, so fall back to the status-bar height the banner already uses.
const TopSafeArea = () => {
  const insets = useSafeAreaInsets();
  const androidStatus =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;
  return <View style={{ height: Math.max(insets.top, androidStatus) }} />;
};

export const RootLayout = ({
  children,
  hideAppHeader = false,
}: {
  children: ReactNode;
  hideAppHeader?: boolean;
}) => (
  <PageChromeProvider>
    <ThemedView className="flex-1">
      {hideAppHeader ? <TopSafeArea /> : <HeaderMobile />}
      <ContentHeader />
      <View className="min-h-0 flex-1">{children}</View>
      <PlusButton />
    </ThemedView>
  </PageChromeProvider>
);

export const withRootLayout = <P extends object>(
  Screen: React.ComponentType<P>
) => {
  const Wrapped = (props: P) => (
    <RootLayout>
      <Screen {...props} />
    </RootLayout>
  );
  Wrapped.displayName = `withRootLayout(${Screen.displayName ?? Screen.name})`;
  return Wrapped;
};
