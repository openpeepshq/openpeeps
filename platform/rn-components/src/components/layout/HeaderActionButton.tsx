import React from 'react';
import { ActivityIndicator } from 'react-native';
import { Button } from '../ui/button';
import { ThemedText } from '../ui/themed-text';

export const HeaderActionButton = ({
  title,
  onPress,
  disabled,
  loading,
}: {
  title: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
}) => (
  <Button disabled={disabled} onPress={onPress}>
    {loading ? <ActivityIndicator size="small" /> : null}
    <ThemedText className="text-primary-foreground text-base font-semibold">
      {title}
    </ThemedText>
  </Button>
);
