import {View, Pressable, ActivityIndicator} from 'react-native';
import React from 'react';
import {Button} from '~/components/ui/button';
import {ArrowLeftIcon} from '~/components/icons';
import {ThemedText} from '~/components/ui/themed-text';
import {useNavigation} from '@react-navigation/native';

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
}: GenericHeaderProps) => {
  const navigation = useNavigation();
  return (
    <View className="sticky top-0 z-20 w-full px-4 py-2 flex flex-row justify-between items-center">
      <View className="flex gap-4 mb-2 flex-row items-center">
        {!hideBackButton && (
          <Button
            size="icon"
            onPress={() =>
              handleGoBack ? handleGoBack() : navigation.goBack()
            }
            variant="outline"
            className="w-12 h-10">
            <ArrowLeftIcon className="text-foreground" />
          </Button>
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
          onPress={onRightButtonPress}>
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
    </View>
  );
};
