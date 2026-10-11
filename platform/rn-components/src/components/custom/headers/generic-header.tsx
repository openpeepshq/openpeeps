import { View, Pressable, ActivityIndicator } from 'react-native';
import React from 'react';
import { Button } from '../../ui/button';
import { ChevronLeftIcon } from '../../icons/index';
import { ThemedText } from '../../ui/themed-text';
import { useNavigation, useRoute } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useCurrentProfile } from '@openpeepshq/react';
import { goToParentOrBack } from '../../navigation/parent-back';
import type { MainStackParamList } from '../../navigation/types';

interface GenericHeaderProps {
  title?: string | React.ReactNode;
  handleGoBack?: () => void;
  onRightButtonPress?: () => void;
  rightType?: 'button' | 'icon' | 'string';
  rightButtonTitle?: string;
  rightButtonDisabled?: boolean;
  rightButtonLoading?: boolean;
  rightButtonIcon?: React.ReactNode;
  rightButtonVariant?: 'primary' | 'secondary' | 'outline';
  hideBackButton?: boolean;
  /** Arbitrary right-side content, e.g. a page-specific action button. */
  rightElement?: React.ReactNode;
}
export const GenericHeader = ({
  title,
  onRightButtonPress,
  rightButtonTitle,
  rightButtonDisabled,
  rightButtonLoading,
  rightType = 'button',
  rightButtonIcon,
  handleGoBack,
  hideBackButton = false,
  rightElement,
}: GenericHeaderProps) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const route = useRoute();
  const me = useCurrentProfile();
  return (
    <View className="sticky top-0 z-20 w-full px-4 py-2 flex flex-row justify-between items-center">
      <View className="flex gap-4 mb-2 flex-row items-center">
        {!hideBackButton && (
          <Pressable
            accessibilityRole="button"
            onPress={() => {
              if (handleGoBack) {
                handleGoBack();
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
        )}
        {typeof title === 'string' ? (
          <ThemedText className="text-xl tracking-wider font-semibold">
            {title}
          </ThemedText>
        ) : (
          <>{title}</>
        )}
      </View>
      {rightButtonTitle && rightType === 'button' && (
        <Button disabled={rightButtonDisabled} onPress={onRightButtonPress}>
          {rightButtonLoading && <ActivityIndicator size={'small'} />}

          <ThemedText className="text-base font-semibold">
            {rightButtonTitle}
          </ThemedText>
        </Button>
      )}
      {rightButtonTitle && rightType === 'string' && (
        <Pressable
          disabled={rightButtonDisabled}
          className="px-4 py-2 border rounded-lg"
          onPress={onRightButtonPress}
        >
          {rightButtonLoading && <ActivityIndicator size={'small'} />}
          <ThemedText className="text-base font-semibold">
            {rightButtonTitle}
          </ThemedText>
        </Pressable>
      )}

      {rightButtonIcon && rightType === 'icon' && (
        <Pressable disabled={rightButtonDisabled} onPress={onRightButtonPress}>
          {rightButtonIcon}
        </Pressable>
      )}
      {rightElement}
    </View>
  );
};
