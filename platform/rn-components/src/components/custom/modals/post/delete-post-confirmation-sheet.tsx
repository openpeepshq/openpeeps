import { View } from 'react-native';
import React, { forwardRef } from 'react';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { PublicPost } from '@openpeepshq/common';
import { BaseSheet, SheetFooter } from '../common';
import { ThemedText } from '~/components/ui/themed-text';
import { useTranslation } from 'react-i18next';
import { FeedPost } from '../../post';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface DeletePostSheeConfirmationSheetProps {
  onDelete: () => Promise<void>;
  post?: PublicPost;
}
export const DeletePostSheeConfirmationSheet = forwardRef<
  BottomSheetModal,
  DeletePostSheeConfirmationSheetProps
>(({ onDelete, post }, ref) => {
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
      <View className="flex-1 p-4 w-full">
        <ThemedText className="text-center text-xl font-semibold mb-6">
          {t('posts.delete.confirm')}
        </ThemedText>
        {post && <FeedPost post={post} previewMode={true} />}

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleDelete}
          disabled={isLoading}
          confirmText={
            isLoading ? t('posts.delete.deleting') : t('common.actions.delete')
          }
          confirmVariant="destructive"
        />
      </View>
    </BaseSheet>
  );
});
