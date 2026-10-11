import React from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCurrentProfile } from '@openpeepshq/react';
import { goToParentOrBack } from '../navigation/parent-back';
import type { MainStackParamList } from '../navigation/types';
import { ChevronLeftIcon } from '../icons/index';
import { ThemedText } from '../ui/themed-text';
import { usePageChrome } from './pageChrome';

export const ContentHeader = () => {
  const { header } = usePageChrome();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute();
  const me = useCurrentProfile();

  const title = header?.title;
  const titleIsString = typeof title === 'string';

  return (
    <View className="border-border flex-row items-center justify-between border-b px-4 py-2">
      <View className="min-w-0 flex-1 flex-row items-center gap-2">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => {
            if (header?.onBack) {
              header.onBack();
              return;
            }
            goToParentOrBack({
              navigation,
              routeName: route.name,
              params: route.params as Record<string, unknown> | undefined,
              profileHandle: me?.handle,
            });
          }}
          className="items-center justify-center p-2"
        >
          <ChevronLeftIcon size={28} className="text-foreground" />
        </Pressable>
        {titleIsString ? (
          <ThemedText
            className="min-w-0 flex-1 text-xl font-semibold"
            numberOfLines={1}
          >
            {title}
          </ThemedText>
        ) : (
          title
        )}
      </View>
      {header?.actions ? (
        <View className="ml-2 shrink-0 flex-row items-center">
          {header.actions}
        </View>
      ) : null}
    </View>
  );
};
