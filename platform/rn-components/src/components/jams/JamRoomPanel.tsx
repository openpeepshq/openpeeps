import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '../ui/themed-text';

/** Centered card used by the non-call jam screens (unavailable, gated, inactive). */
export const JamRoomPanel = ({
  title,
  children,
}: {
  title?: string;
  children: ReactNode;
}) => (
  <View className="w-full flex-1 items-center justify-center p-4">
    <View className="w-full max-w-md gap-5">
      {title ? (
        <ThemedText className="text-center text-lg">{title}</ThemedText>
      ) : null}
      <View className="w-full items-center justify-center gap-3 rounded border border-border bg-card p-4">
        {children}
      </View>
    </View>
  </View>
);

export const JamRoomPanelLink = ({
  label,
  onPress,
}: {
  label: string;
  onPress: () => void;
}) => (
  <Pressable onPress={onPress} accessibilityRole="link">
    <ThemedText className="text-sm text-primary underline">{label}</ThemedText>
  </Pressable>
);
