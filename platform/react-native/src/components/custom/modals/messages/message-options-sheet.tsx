import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '~/components/ui/themed-text';
import { CopyIcon, Trash2Icon } from '~/components/icons';
import { BaseSheet } from '../common';
import { Button } from '~/components/ui/button';
import { useTranslation } from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface MessageOptionsSheetProps {
  onDelete?: () => void;
  onDeleteForEveryone?: () => void;
  message: string;
  isCurrentUser: boolean;
}

export const MessageOptionsSheet = forwardRef<
  BottomSheetModal,
  MessageOptionsSheetProps
>(({ onDelete, onDeleteForEveryone, isCurrentUser }, ref) => {
  const { t } = useTranslation();

  const handleCopyMessage = async () => {
    bottomSheetClose(ref);
  };

  const handleDelete = () => {
    onDelete?.();
    bottomSheetClose(ref);
  };

  const handleDeleteForEveryone = () => {
    onDeleteForEveryone?.();
    bottomSheetClose(ref);
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 px-4 py-2">
        <View className="space-y-2">
          <Button
            variant="ghost"
            className="flex-row items-center justify-start py-4"
            onPress={handleCopyMessage}>
            <CopyIcon className="mr-2 text-foreground" size={20} />
            <ThemedText>{t('conversations.message.copy.title')}</ThemedText>
          </Button>

          <Button
            variant="ghost"
            className="flex-row items-center justify-start py-4"
            onPress={handleDelete}>
            <Trash2Icon className="mr-2 text-foreground" size={20} />
            <ThemedText>
              {t('conversations.message.delete.deleteForMe')}
            </ThemedText>
          </Button>

          {isCurrentUser && (
            <Button
              variant="ghost"
              className="flex-row items-center justify-start py-4"
              onPress={handleDeleteForEveryone}>
              <Trash2Icon className="mr-2 text-destructive" size={20} />
              <ThemedText className="text-destructive">
                {t('conversations.message.delete.deleteForEveryone')}
              </ThemedText>
            </Button>
          )}
        </View>
      </View>
    </BaseSheet>
  );
});
