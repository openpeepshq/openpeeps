import React from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '~/components/ui/themed-text';
import { ChevronRightIcon } from '~/components/icons';

export interface ConfigMenuButtonProps {
  translationPrefix: string;
  onPress: () => void;
  titleFallback?: string;
  descriptionFallback?: string;
}

/** Row in a settings menu: title, description and a chevron. */
export const ConfigMenuButton = ({
  translationPrefix,
  onPress,
  titleFallback,
  descriptionFallback,
}: ConfigMenuButtonProps) => {
  const { t } = useTranslation();
  return (
    <Pressable
      onPress={onPress}
      className="py-2 mb-2 flex-row justify-between items-center gap-x-4"
    >
      <View className="flex-1">
        <ThemedText className="text-lg font-semibold">
          {t(
            `${translationPrefix}.title`,
            titleFallback ? { defaultValue: titleFallback } : {}
          )}
        </ThemedText>
        <ThemedText className="text-muted-foreground">
          {t(
            `${translationPrefix}.description`,
            descriptionFallback ? { defaultValue: descriptionFallback } : {}
          )}
        </ThemedText>
      </View>
      <ChevronRightIcon className="text-foreground" />
    </Pressable>
  );
};
