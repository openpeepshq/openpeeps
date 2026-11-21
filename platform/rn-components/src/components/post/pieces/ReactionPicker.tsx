import React from 'react';
import { Pressable, View } from 'react-native';
import { REACTION_TYPES } from '@openpeepshq/common';
import type { ReactionData } from '@openpeepshq/common/types';
import { useTranslation } from 'react-i18next';
import { ThemedText } from '../../ui/themed-text';
import { XIcon } from '../../icons/index';
import { cn } from '../../../lib/utils';

export interface ReactionPickerProps {
  /** Reactions the current profile already attached to this post. */
  myReactions: string[];
  onToggle: (reaction: ReactionData['reaction']) => void;
  /** Closes the picker (mirrors the web popover closing on outside click). */
  onClose: () => void;
}

/**
 * Post reaction selection: a row of the curated reactions. Tapping an emoji
 * toggles the current profile's reaction for the post (mirrors the jam
 * reaction menu). A close (dismiss) button at the end of the row lets the
 * picker be closed without re-tapping the React button, matching the web
 * picker's outside-click dismissal.
 */
export const ReactionPicker = ({
  myReactions,
  onToggle,
  onClose,
}: ReactionPickerProps) => {
  const { t } = useTranslation();

  return (
    <View className="flex-row items-center gap-1">
      {REACTION_TYPES.map((reaction) => (
        <Pressable
          key={reaction}
          accessibilityRole="button"
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
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={t('posts.actions.closeReactionPicker')}
        onPress={onClose}
        className="shrink-0 rounded-md p-2"
      >
        <XIcon size={16} className="text-muted-foreground" />
      </Pressable>
    </View>
  );
};
