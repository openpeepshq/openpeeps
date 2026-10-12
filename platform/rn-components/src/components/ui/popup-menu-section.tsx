import * as React from 'react';
import { View } from 'react-native';
import { ThemedText } from './themed-text';
import { cn } from '../../lib/utils';

export interface PopupSectionProps {
  title: string;
}

/**
 * Section header for PopupMenu, mirrors @openpeepshq/react-ui's PopupSection.
 */
export const PopupSection = ({ title }: PopupSectionProps) => {
  return (
    <View className="w-full py-2">
      <ThemedText className={cn('text-xs font-semibold text-muted-foreground')}>
        {title}
      </ThemedText>
    </View>
  );
};
