import React from 'react';
import { ActivityIndicator, View } from 'react-native';
import { cn } from '../../lib/utils';

export interface LoadingSpinnerProps {
  size?: 'small' | 'large';
  className?: string;
}

/**
 * Native equivalent of @openpeepshq/react-ui's LoadingSpinner.
 * Uses React Native's ActivityIndicator, which respects the system's
 * preferred indicator style and color scheme.
 */
export const LoadingSpinner = ({
  size = 'small',
  className,
}: LoadingSpinnerProps) => {
  return (
    <View className={cn('items-center justify-center', className)}>
      <ActivityIndicator size={size} />
    </View>
  );
};
