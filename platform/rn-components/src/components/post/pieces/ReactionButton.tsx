import React from 'react';
import { Pressable } from 'react-native';
import { ThemedText } from '../../ui/themed-text';
import { cn } from '../../../lib/utils';

export interface ReactionButtonProps {
  reaction: string;
  /** Accessible label; defaults to the emoji itself. */
  title?: string;
  /** Highlight the emoji the profile has already attached. */
  active?: boolean;
  /** An emoji no longer in the allowed set but still attached — dim it. */
  orphan?: boolean;
  onPress: () => void;
}

/**
 * A single emoji reaction control, shared by the post reaction picker and the
 * jam reaction menu so tap/active styling lives in one place instead of
 * drifting across copies.
 */
export const ReactionButton = ({
  reaction,
  title,
  active = false,
  orphan = false,
  onPress,
}: ReactionButtonProps) => (
  <Pressable
    accessibilityRole="button"
    accessibilityLabel={title ?? reaction}
    onPress={onPress}
    className={cn(
      'shrink-0 rounded-md p-2',
      active && 'bg-border',
      orphan && 'opacity-60'
    )}
  >
    <ThemedText className="text-lg">{reaction}</ThemedText>
  </Pressable>
);
