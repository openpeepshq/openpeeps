import { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronLeft, SmilePlus } from 'lucide-react';
import { useT } from '../../i18n';
import { emojis } from './constants';
import {
  SKIN_TONE_OPTIONS,
  addRecentEmoji,
  applySkinToneToDefault,
  applySkinToneToRecentEmojis,
  getSkinToneEmoji,
  hideEmojiPickerSkinToneSelector,
  isDefaultEmoji,
  syncEmojiPickerSkinTone,
} from './reactionEmojis';
import { useJamReactionPreferences } from './jamReactionPreferences';

export interface JamReactionMenuProps {
  onSelect: (emoji: string) => void | Promise<void>;
  mobile?: boolean;
}

/**
 * Reaction picker mirroring the Svelte `ReactionMenu`: a quick row of default
 * emojis (with the preferred skin tone applied) and recently used emojis, a
 * skin-tone selector, and an "all emojis" view backed by the
 * `emoji-picker-element` web component. Preferences persist via
 * {@link useJamReactionPreferences}.
 */
export function JamReactionMenu({
  onSelect,
  mobile = false,
}: JamReactionMenuProps) {
  const t = useT();
  const [preferences, updatePreferences] = useJamReactionPreferences();
  const { skinTone, recentEmojis } = preferences;

  const [showAllEmojis, setShowAllEmojis] = useState(false);
  const [showSkinToneSelector, setShowSkinToneSelector] = useState(false);
  const pickerRef = useRef<HTMLElement | null>(null);

  const defaultEmojis = emojis.map((emoji) =>
    applySkinToneToDefault(emoji, skinTone),
  );
  const recentDisplayEmojis = recentEmojis.filter(
    (emoji) => !isDefaultEmoji(emoji),
  );
  const selectedSkinToneEmoji = getSkinToneEmoji(skinTone);

  // Register the custom element and sync the preferred skin tone once.
  useEffect(() => {
    let cancelled = false;
    void import('emoji-picker-element').then(() => {
      if (!cancelled) void syncEmojiPickerSkinTone(skinTone);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePickerEmojiClick = useCallback(
    (event: Event) => {
      const emoji = (event as CustomEvent<{ unicode: string }>).detail?.unicode;
      if (!emoji) return;
      void onSelect(emoji);
      if (!isDefaultEmoji(emoji)) {
        updatePreferences((current) => ({
          ...current,
          recentEmojis: addRecentEmoji(current.recentEmojis, emoji),
        }));
      }
      setShowAllEmojis(false);
    },
    [onSelect, updatePreferences],
  );

  // When the picker is shown, sync the skin tone, hide its built-in skin-tone
  // selector, and listen for emoji clicks (a CustomEvent, so not a JSX prop).
  useEffect(() => {
    const picker = pickerRef.current;
    if (!showAllEmojis || !picker) return;
    void syncEmojiPickerSkinTone(skinTone).then(() => {
      hideEmojiPickerSkinToneSelector(picker);
    });
    picker.addEventListener('emoji-click', handlePickerEmojiClick);
    return () => {
      picker.removeEventListener('emoji-click', handlePickerEmojiClick);
    };
  }, [showAllEmojis, skinTone, handlePickerEmojiClick]);

  const handleSetSkinTone = async (tone: number) => {
    updatePreferences((current) => ({
      ...current,
      skinTone: tone,
      recentEmojis: applySkinToneToRecentEmojis(current.recentEmojis, tone),
    }));
    await syncEmojiPickerSkinTone(tone);
    setShowSkinToneSelector(false);
  };

  const openAllEmojis = async () => {
    setShowSkinToneSelector(false);
    await syncEmojiPickerSkinTone(skinTone);
    setShowAllEmojis(true);
  };

  return (
    <div
      className={`bg-surface-2 rounded-2xl p-2 ${mobile ? 'w-full' : 'md:w-max'}`}
    >
      {showAllEmojis ? (
        <>
          <div className="mb-2">
            <button
              type="button"
              title={t('jams.reactions.backToQuickReactions')}
              className="flex items-center gap-1 p-1 text-sm"
              onClick={() => setShowAllEmojis(false)}
            >
              <ChevronLeft className="size-4" />
              {t('jams.reactions.backToQuickReactions')}
            </button>
          </div>
          <emoji-picker ref={pickerRef} />
        </>
      ) : (
        <>
          <div className="flex flex-col gap-y-1 md:flex-row md:flex-nowrap md:items-center md:gap-x-1">
            <div className="flex flex-wrap items-center gap-x-1 md:flex-nowrap">
              {defaultEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  title={emoji}
                  className="shrink-0 p-2 text-lg"
                  onClick={() => void onSelect(emoji)}
                >
                  {emoji}
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-x-1 md:flex-nowrap">
              <div
                className="bg-border-2 mx-1 h-8 w-px shrink-0 self-center max-md:hidden"
                aria-hidden="true"
              />

              {recentDisplayEmojis.length > 0 ? (
                <>
                  {recentDisplayEmojis.map((emoji) => (
                    <button
                      key={emoji}
                      type="button"
                      title={emoji}
                      className="shrink-0 p-2 text-lg"
                      onClick={() => void onSelect(emoji)}
                    >
                      {emoji}
                    </button>
                  ))}
                  <div
                    className="bg-border-2 mx-1 h-8 w-px shrink-0 self-center"
                    aria-hidden="true"
                  />
                </>
              ) : null}

              <button
                type="button"
                title={t('jams.reactions.skinToneTitle')}
                className={`shrink-0 rounded p-2 text-lg ${showSkinToneSelector ? 'bg-border-2' : ''}`}
                onClick={() => setShowSkinToneSelector((open) => !open)}
              >
                {selectedSkinToneEmoji}
              </button>

              <button
                type="button"
                title={t('jams.reactions.allEmojisTitle')}
                className="shrink-0 p-2"
                onClick={() => void openAllEmojis()}
              >
                <SmilePlus className="size-5" />
              </button>
            </div>
          </div>

          {showSkinToneSelector ? (
            <div className="border-border mt-2 flex gap-1 border-t pt-2">
              {SKIN_TONE_OPTIONS.map((option) => (
                <button
                  key={option.tone}
                  type="button"
                  title={t('jams.reactions.skinToneTitle')}
                  className={`rounded p-1 text-lg ${skinTone === option.tone ? 'bg-border-2' : ''}`}
                  onClick={() => void handleSetSkinTone(option.tone)}
                >
                  {option.emoji}
                </button>
              ))}
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
