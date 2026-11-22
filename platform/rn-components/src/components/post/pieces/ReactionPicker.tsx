import React from 'react';
import { View } from 'react-native';
import type { ReactionData } from '@openpeepshq/common/types';
import { useTranslation } from 'react-i18next';
import { ReactionButton } from './ReactionButton';

export interface ReactionPickerProps {
  /** Reactions the current profile already attached to this post. */
  myReactions: string[];
  /** Emojis the community allows on posts (from useAllowedReactions). */
  reactions: readonly string[];
  onToggle: (reaction: ReactionData['reaction']) => void;
}

/**
 * Post reaction selection: a row of the community's allowed reactions, plus
 * any of the profile's own reactions that are no longer allowed (orphans) so
 * they stay visible and retractable. Tapping an emoji toggles the current
 * profile's reaction for the post (mirrors the jam reaction menu).
 */
export const ReactionPicker = ({
  myReactions,
  reactions,
  onToggle,
}: ReactionPickerProps) => {
  const { t } = useTranslation();
  const orphans = myReactions.filter(
    (reaction) => !reactions.includes(reaction)
  );
  return (
    <View className="flex-row items-center gap-1">
      {reactions.map((reaction) => (
        <ReactionButton
          key={reaction}
          reaction={reaction}
          active={myReactions.includes(reaction)}
          onPress={() => onToggle(reaction)}
        />
      ))}
      {orphans.length > 0 ? (
        <>
          <View className="mx-1 h-8 w-px shrink-0 bg-border" />
          {orphans.map((reaction) => (
            <ReactionButton
              key={reaction}
              reaction={reaction}
              orphan
              active
              title={t('posts.actions.orphanedReaction')}
              onPress={() => onToggle(reaction)}
            />
          ))}
        </>
      ) : null}
    </View>
  );
};
