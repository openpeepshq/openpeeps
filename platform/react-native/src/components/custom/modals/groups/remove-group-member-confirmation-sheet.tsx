import React, {forwardRef} from 'react';
import {View} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemedText} from '../../../ui/themed-text';
import {Profile} from '@openpeeps/common';
import {BaseSheet, SheetFooter} from '../common';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';

interface RemoveGroupMemberConfirmationSheetProps {
  onRemove: () => Promise<void>;
  profile: Profile;
}

export const RemoveGroupMemberConfirmationSheet = forwardRef<
  BottomSheetModal,
  RemoveGroupMemberConfirmationSheetProps
>(({onRemove, profile}, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const {t} = useTranslation();

  const handleRemoveMember = async () => {
    try {
      setIsLoading(true);
      await onRemove();
      Toast.show({
        type: 'success',
        text1: t('groups.removeMember.successMessage'),
      });
      bottomSheetClose(ref);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('groups.removeMember.successMessage'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 p-4">
        <View className="w-full">
          <ThemedText className="text-center text-xl font-semibold mb-6">
            {t('groups.removeMember.title')}
          </ThemedText>
          <ThemedText className="text-center text-base text-muted-foreground mb-6">
            {t('groups.removeMember.description', {
              handle: profile?.handle,
            })}
          </ThemedText>
        </View>

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleRemoveMember}
          disabled={isLoading}
          confirmText={
            isLoading
              ? t('groups.removeMember.loading')
              : t('groups.removeMember.confirm')
          }
          variant="destructive"
        />
      </View>
    </BaseSheet>
  );
});
