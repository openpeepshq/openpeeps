import {View} from 'react-native';
import React, {forwardRef} from 'react';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {BaseSheet, SheetFooter} from '../common';
import {ThemedText} from '../../../ui/themed-text';
import {useTranslation} from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';

interface DeleteEventSheettProps {
  onDelete: () => Promise<void>;
}

export const DeleteEventSheet = forwardRef<
  BottomSheetModal,
  DeleteEventSheettProps
>(({onDelete}, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const {t} = useTranslation();

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await onDelete();
      bottomSheetClose(ref);
    } catch (error) {
      console.error('Failed to delete event:', error);
    } finally {
      setIsLoading(false);
    }
  };
  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 p-4">
        <View className="w-full">
          <ThemedText className="text-center text-xl font-semibold mb-6">
            {t('posts.deleteEvent.title')}
          </ThemedText>
          <View className="mt-4 mb-6">
            <ThemedText className="text-center text-muted-foreground">
              {t('posts.deleteEvent.description')}
            </ThemedText>
          </View>
        </View>

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleDelete}
          cancelText={t('posts.deleteEvent.cancel')}
          disabled={isLoading}
          confirmText={
            isLoading
              ? t('posts.delete.deleting')
              : t('posts.deleteEvent.confirm')
          }
          variant="destructive"
        />
      </View>
    </BaseSheet>
  );
});
