import { View } from 'react-native';
import React from 'react';
import { cn } from '../../../lib/utils';

interface UnreadPostIndicatorProps {
  show: boolean;
  className?: string;
  /** `corner` is a top-left fold on feed cards; `dot` is the in-flow mark.
   * On RN only `dot` is supported — `corner` renders nothing (CSS-only effect). */
  variant?: 'dot' | 'corner';
}

/**
 * Subtle unread marker positioned in the host's left margin.
 * Absolutely positioned so visibility changes never shift layout.
 */
export const UnreadPostIndicator = ({
  show,
  className,
  variant = 'dot',
}: UnreadPostIndicatorProps) => {
  if (!show) return null;
  if (variant === 'corner') return null;

  return (
    <View
      pointerEvents="none"
      className={cn(
        'absolute left-1.5 top-6 size-1.5 rounded-full bg-muted-foreground/45',
        className
      )}
    />
  );
};
