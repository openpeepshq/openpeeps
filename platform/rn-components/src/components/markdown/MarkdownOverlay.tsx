import { useTranslation } from 'react-i18next';
import { Modal, Pressable, ScrollView, View } from 'react-native';
import React, { useState } from 'react';
import { OpenpeepsMarkdown } from './OpenpeepsMarkdown';
import { ThemedText } from '../ui/themed-text';
import { Button } from '../ui/button';

export interface MarkdownOverlayProps {
  /** Full markdown rendered inside the overlay when expanded. */
  source: string;
  /** Pressable trigger content (usually the clamped excerpt). */
  children: React.ReactNode;
  /** Accessibility label for the long-press target. */
  label?: string;
}

/**
 * Reusable pressable-driven overlay: long-pressing `children` opens a centered
 * Modal rendering `source` as full markdown. Used by `TruncatedMarkdown` so every
 * abbreviated preview can reveal its full markdown content on touch devices
 * (where hover is unavailable). The backdrop and close button both dismiss it.
 */
export const MarkdownOverlay = ({
  source,
  children,
  label,
}: MarkdownOverlayProps) => {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  return (
    <>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          label ??
          t('posts.truncatedMarkdown.show', { defaultValue: 'Show more' })
        }
        accessibilityHint={t('posts.truncatedMarkdown.showHint', {
          defaultValue: 'Long press to read the full text',
        })}
        onLongPress={() => setOpen(true)}
      >
        {children}
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          onPress={() => setOpen(false)}
          className="bg-black/60 flex-1 items-center justify-center"
        >
          <View className="w-11/12 max-w-lg rounded-lg bg-background p-4 max-h-[80%]">
            <ScrollView>
              <OpenpeepsMarkdown source={source} linkPreviewMode="none" />
            </ScrollView>
            <View className="mt-4 flex justify-end">
              <Button onPress={() => setOpen(false)}>
                <ThemedText>
                  {t('posts.truncatedMarkdown.close', {
                    defaultValue: 'Close',
                  })}
                </ThemedText>
              </Button>
            </View>
          </View>
        </Pressable>
      </Modal>
    </>
  );
};
