import { View } from 'react-native';
import React, { type ReactNode } from 'react';
import { Button } from '../../ui/button';
import { ImageIcon, AudioLinesIcon, PaperclipIcon } from '../../icons/index';
import { useTranslation } from 'react-i18next';

interface FooterProps {
  onImagePress: () => void;
  onAudioPress: () => void;
  onDocumentPress: () => void;
  typeSwitcher?: ReactNode;
  hideMedia?: boolean;
}

export const Footer = ({
  onImagePress,
  onAudioPress,
  onDocumentPress,
  typeSwitcher,
  hideMedia = false,
}: FooterProps) => {
  const { t } = useTranslation();

  return (
    <View className="border-t border-border bg-background px-4 py-3">
      <View className="flex-row items-center justify-between">
        {hideMedia ? (
          <View />
        ) : (
          <View className="flex-row items-center gap-2">
            <Button
              size="icon"
              variant="ghost"
              accessibilityLabel={t('posts.form.addImage')}
              onPress={onImagePress}
            >
              <ImageIcon size={20} className="text-foreground" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              accessibilityLabel={t('posts.form.addAudio')}
              onPress={onAudioPress}
            >
              <AudioLinesIcon size={20} className="text-foreground" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              accessibilityLabel={t('posts.form.addDocument')}
              onPress={onDocumentPress}
            >
              <PaperclipIcon size={20} className="text-foreground" />
            </Button>
          </View>
        )}
        {typeSwitcher}
      </View>
    </View>
  );
};
