import React, { type ReactNode } from 'react';
import { View } from 'react-native';
import { ThemedView } from '../ui/themed-view';
import { ContentHeader } from './ContentHeader';
import { HeaderMobile } from './HeaderMobile';
import { PageChromeProvider } from './pageChrome';
import { PlusButton } from './PlusButton';

export const RootLayout = ({ children }: { children: ReactNode }) => (
  <PageChromeProvider>
    <ThemedView className="flex-1">
      <HeaderMobile />
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
