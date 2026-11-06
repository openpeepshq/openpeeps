import React from 'react';
import { Pressable, View } from 'react-native';
import { REACTION_TYPES } from '@openpeepshq/common';
import type { ReactionData } from '@openpeepshq/common/types';
import { ThemedText } from '../../ui/themed-text';
import { cn } from '../../../lib/utils';

export interface ReactionPickerProps {
  /** Reactions the current profile already attached to this post. */
  myReactions: string[];
  onToggle: (reaction: ReactionData['reaction']) => void;
}

/**
 * Post reaction selection: a row of the curated reactions. Tapping an emoji
 * toggles the current profile's reaction for the post (mirrors the jam
 * reaction menu).
 */
export const ReactionPicker = ({
  myReactions,
  onToggle,
}: ReactionPickerProps) => (
  <View className="flex-row items-center gap-1">
    {REACTION_TYPES.map((reaction) => (
      <Pressable
        key={reaction}
        accessibilityLabel={reaction}
        onPress={() => onToggle(reaction)}
        className={cn(
          'shrink-0 rounded-md p-2',
          myReactions.includes(reaction) && 'bg-border'
        )}
      >
        <ThemedText className="text-lg">{reaction}</ThemedText>
      </Pressable>
    ))}
  </View>
);
