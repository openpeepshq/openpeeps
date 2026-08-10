import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '~/components/ui/themed-text';
import { PublicPost } from '@openpeepshq/common';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface DeleteMessageConfirmationSheetProps {
  onDelete: () => Promise<void>;
  message?: PublicPost;
}

export const DeleteMessageConfirmationSheet = forwardRef<
  BottomSheetModal,
  DeleteMessageConfirmationSheetProps
>(({ onDelete }, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { t } = useTranslation();

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await onDelete();
      bottomSheetClose(ref);
    } catch (error) {
      console.error('Failed to delete message:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 p-4">
        <View className="w-full">
          <ThemedText className="text-center text-xl font-semibold mb-6">
            {t('conversations.message.delete.title')}
          </ThemedText>
          <ThemedText className="text-center text-base text-muted-foreground mb-6">
            {t('conversations.message.delete.description')}
          </ThemedText>
        </View>

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleDelete}
          disabled={isLoading}
          confirmText={
            isLoading
              ? t('conversations.message.delete.loading')
              : t('conversations.message.delete.confirm')
          }
          variant="destructive"
        />
      </View>
    </BaseSheet>
  );
});
