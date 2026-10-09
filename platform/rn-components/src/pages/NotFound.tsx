import React from 'react';
import { Pressable, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useTranslation } from 'react-i18next';
import { MainStackParamList } from '../components/navigation/types/index';
import { ThemedSafeAreaView } from '../components/ui/themed-safe-area-view';
import { ThemedText } from '../components/ui/themed-text';

/** Fallback for unresolved deep links; web renders this for unknown routes. */
export const NotFound = () => {
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  return (
    <ThemedSafeAreaView className="flex-1">
      <View className="flex-1 items-center justify-center gap-y-3 px-6 py-16">
        <ThemedText className="text-3xl font-semibold">404</ThemedText>
        <ThemedText className="text-muted-foreground text-sm text-center">
          {t('common.notFound', {
            defaultValue: "We couldn't find that page.",
          })}
        </ThemedText>
        <Pressable
          onPress={() =>
            navigation.navigate('TabNavigator', { screen: 'Home' })
          }
        >
          <ThemedText className="text-primary text-sm underline">
            {t('common.backHome', { defaultValue: 'Back home' })}
          </ThemedText>
        </Pressable>
      </View>
    </ThemedSafeAreaView>
  );
};
