import React, { type ReactNode } from 'react';
import { Pressable, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { XIcon } from '../icons/index';
import { ThemedText } from '../ui/themed-text';

/**
 * Full-overlay side panel used by the chat, people and details drawers —
 * the web mobile layout, where drawers cover the conference view.
 */
export const JamDrawer = ({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
}) => {
  const { t } = useTranslation();
  return (
    <View className="absolute inset-0 z-30 gap-3 overflow-hidden rounded bg-card">
      <View className="w-full flex-row items-center justify-between border-b border-border p-2">
        <ThemedText className="text-lg">{title}</ThemedText>
        <Pressable
          accessibilityLabel={t('jams.drawer.close')}
          accessibilityRole="button"
          onPress={onClose}
          className="size-10 shrink-0 items-center justify-center"
        >
          <XIcon size={20} className="text-foreground" />
        </Pressable>
      </View>
      {children}
    </View>
  );
};
