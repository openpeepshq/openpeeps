import React, {forwardRef} from 'react';
import {View} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemedText} from '~/components/ui/themed-text';
import {BaseSheet, SheetFooter} from '../common';
import {useTranslation} from 'react-i18next';
import {GroupWithMeta} from '@openpeepshq/common';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface DeleteGroupConfirmationSheetProps {
  onDelete: () => Promise<void>;
  group: GroupWithMeta;
}

export const DeleteGroupConfirmationSheet = forwardRef<
  BottomSheetModal,
  DeleteGroupConfirmationSheetProps
>(({onDelete, group}, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const {t} = useTranslation();

  const handleDelete = async () => {
    try {
      setIsLoading(true);
      await onDelete();
      bottomSheetClose(ref);
    } catch (error) {
      console.error('Failed to delete group:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 p-4">
        <View className="w-full">
          <ThemedText className="text-center text-xl font-semibold mb-6">
            {t('groups.delete.title')}
          </ThemedText>
          <ThemedText className="text-center text-base text-muted-foreground mb-6">
            {t('groups.delete.description', {
              groupName: group.displayName,
            })}
          </ThemedText>
        </View>

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          cancelText={t('groups.delete.cancel')}
          onConfirm={handleDelete}
          disabled={isLoading}
          confirmText={
            isLoading ? t('groups.delete.deleting') : t('groups.delete.confirm')
          }
          variant="destructive"
        />
      </View>
    </BaseSheet>
  );
});
