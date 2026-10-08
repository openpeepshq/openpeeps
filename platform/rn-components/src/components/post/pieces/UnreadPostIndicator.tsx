import { View } from 'react-native';
import React from 'react';

interface UnreadPostIndicatorProps {
  show: boolean;
}

/**
 * Subtle unread marker positioned in the host's left margin.
 * Absolutely positioned so visibility changes never shift layout.
 */
export const UnreadPostIndicator = ({ show }: UnreadPostIndicatorProps) => {
  if (!show) return null;

  return (
    <View
      pointerEvents="none"
      className="absolute left-1.5 top-6 size-1.5 rounded-full bg-muted-foreground/45"
    />
  );
};
