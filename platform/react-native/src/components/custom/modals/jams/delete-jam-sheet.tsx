import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '../../../ui/themed-text';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';

export interface DeleteJamSheetRef {
  present: () => void;
  dismiss: () => void;
}

interface DeleteJamSheetProps {
  onDelete?: () => Promise<void>;
}

export const DeleteJamSheet = forwardRef<
  DeleteJamSheetRef,
  DeleteJamSheetProps
>(({ onDelete }, ref) => {
  const bottomSheetModalRef = useRef<BottomSheetModal>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const { t } = useTranslation();

  useImperativeHandle(ref, () => ({
    present: () => {
      bottomSheetModalRef.current?.present();
    },
    dismiss: () => {
      bottomSheetModalRef.current?.dismiss();
    },
  }));

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await onDelete?.();
      bottomSheetModalRef.current?.dismiss();
    } catch (error) {
      console.error('Failed to delete jam:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseSheet ref={bottomSheetModalRef}>
      <View className="flex-1 p-4">
        <View className="items-center mb-4">
          <ThemedText className="text-lg font-semibold">
            {t('common.actions.confirm')}
          </ThemedText>
        </View>

        <ThemedText className="text-center mb-6 text-muted-foreground">
          {t('common.actions.delete')}
        </ThemedText>

        <SheetFooter
          onCancel={() => bottomSheetModalRef.current?.dismiss()}
          onConfirm={handleDelete}
          confirmText={t('common.actions.delete')}
          variant="destructive"
          disabled={isLoading}
        />
      </View>
    </BaseSheet>
  );
});
