import { View } from 'react-native';
import React, { forwardRef } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { BaseSheet, SheetFooter } from '../custom/modals/common';
import { ThemedText } from '../ui/themed-text';
import { useTranslation } from 'react-i18next';
import { bottomSheetClose } from '../../lib/bottom-sheet-ref';

interface DeleteMessageSheetProps {
  onDelete: () => Promise<void>;
}

/** Destructive confirm sheet for deleting a single jam chat message. */
export const DeleteMessageSheet = forwardRef<
  BottomSheetModal,
  DeleteMessageSheetProps
>(({ onDelete }, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { t } = useTranslation();

  const handleDelete = async () => {
    // No catch: error handling is owned by the drawer (`JamChatDrawer.
    // handleDeleteMessage`), which shows the toast and never rethrows, so the
    // sheet's `isLoading` only needs the `finally` reset.
    try {
      setIsLoading(true);
      await onDelete();
      bottomSheetClose(ref);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 w-full p-4">
        <ThemedText className="mb-2 text-center text-xl font-semibold">
          {t('jams.chat.deleteTitle')}
        </ThemedText>
        <ThemedText className="mb-6 text-center text-muted-foreground">
          {t('jams.chat.deleteConfirm')}
        </ThemedText>
        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleDelete}
          disabled={isLoading}
          cancelText={t('jams.chat.cancel')}
          confirmText={t('jams.chat.delete')}
          confirmVariant="destructive"
        />
      </View>
    </BaseSheet>
  );
});
