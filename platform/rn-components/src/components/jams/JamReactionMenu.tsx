import React, { useState } from 'react';
import { ScrollView, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  SKIN_TONE_OPTIONS,
  applySkinToneToDefault,
  applySkinToneToRecentEmojis,
  emojis,
  getSkinToneEmoji,
  isDefaultEmoji,
  useJamReactionPreferences,
} from '@openpeepshq/react';
import { ReactionButton } from '../post/pieces/ReactionButton';

export interface JamReactionMenuProps {
  onSelect: (emoji: string) => void | Promise<void>;
}

/**
 * Reaction picker: a quick row of default emojis (with the preferred skin
 * tone applied), recently used emojis and a skin-tone selector. The web "all
 * emojis" view depends on the `emoji-picker-element` web component and has no
 * native counterpart.
 */
export const JamReactionMenu = ({ onSelect }: JamReactionMenuProps) => {
  const { t } = useTranslation();
  const [preferences, updatePreferences] = useJamReactionPreferences();
  const { skinTone, recentEmojis } = preferences;
  const [showSkinToneSelector, setShowSkinToneSelector] = useState(false);

  const defaultEmojis = emojis.map((emoji) =>
    applySkinToneToDefault(emoji, skinTone)
  );
  const recentDisplayEmojis = recentEmojis.filter(
    (emoji) => !isDefaultEmoji(emoji)
  );

  const handleSetSkinTone = (tone: number) => {
    updatePreferences((current) => ({
      ...current,
      skinTone: tone,
      recentEmojis: applySkinToneToRecentEmojis(current.recentEmojis, tone),
    }));
    setShowSkinToneSelector(false);
  };

  return (
    <View className="w-full rounded-2xl bg-muted p-2">
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerClassName="flex-row items-center gap-x-1"
      >
        {defaultEmojis.map((emoji) => (
          <ReactionButton
            key={emoji}
            reaction={emoji}
            title={emoji}
            onPress={() => void onSelect(emoji)}
          />
        ))}
        {recentDisplayEmojis.length > 0 ? (
          <>
            <View className="mx-1 h-8 w-px shrink-0 bg-border" />
            {recentDisplayEmojis.map((emoji) => (
              <ReactionButton
                key={emoji}
                reaction={emoji}
                title={emoji}
                onPress={() => void onSelect(emoji)}
              />
            ))}
          </>
        ) : null}
        <View className="mx-1 h-8 w-px shrink-0 bg-border" />
        <ReactionButton
          reaction={getSkinToneEmoji(skinTone)}
          title={t('jams.reactions.skinToneTitle')}
          active={showSkinToneSelector}
          onPress={() => setShowSkinToneSelector((open) => !open)}
        />
      </ScrollView>

      {showSkinToneSelector ? (
        <View className="mt-2 flex-row gap-1 border-t border-border pt-2">
          {SKIN_TONE_OPTIONS.map((option) => (
            <ReactionButton
              key={option.tone}
              reaction={option.emoji}
              title={t('jams.reactions.skinToneTitle')}
              active={skinTone === option.tone}
              onPress={() => handleSetSkinTone(option.tone)}
            />
          ))}
        </View>
      ) : null}
    </View>
  );
};
