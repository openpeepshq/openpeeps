import React, { forwardRef } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '~/components/ui/themed-text';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';


interface DeleteGroupSheetProps {
  onDelete: () => Promise<void>;
}

export const DeleteGroupSheet = forwardRef<
  BottomSheetModal,
  DeleteGroupSheetProps
>(({ onDelete }, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const { t } = useTranslation();

  const handleDelete = async () => {
    setIsLoading(true);
    try {
      await onDelete();
    } finally {
      setIsLoading(false);
      bottomSheetClose(ref);
    }
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 p-4">
        <View className="w-full">
          <ThemedText className="text-center text-lg my-2">
            {t('groups.delete.confirm')}
          </ThemedText>
        </View>
        <View className="items-center justify-center">
          <ThemedText className="p-4">
            {t('groups.delete.description')}
          </ThemedText>
        </View>
        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleDelete}
          confirmText={t('group.delete.button')}
          disabled={isLoading}
        />
      </View>
    </BaseSheet>
  );
});
