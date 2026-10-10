import React, { type ReactNode } from 'react';
import { Pressable } from 'react-native';

interface PlusFabProps {
  accessibilityLabel: string;
  onPress: () => void;
  children: ReactNode;
}

export const PlusFab = ({
  accessibilityLabel,
  onPress,
  children,
}: PlusFabProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={accessibilityLabel}
    onPress={onPress}
    className="absolute bottom-10 right-6 z-20 size-16 items-center justify-center rounded-full bg-foreground"
  >
    {children}
  </Pressable>
);
