import React, {forwardRef} from 'react';
import {View} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemedText} from '../../../ui/themed-text';
import {Profile} from '@openpeeps/common';
import {BaseSheet, SheetFooter} from '../common';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';

interface MakeGroupMemberAdminConfirmationSheetProps {
  onMakeAdmin: () => Promise<void>;
  profile: Profile;
}

export const MakeGroupMemberAdminConfirmationSheet = forwardRef<
  BottomSheetModal,
  MakeGroupMemberAdminConfirmationSheetProps
>(({onMakeAdmin, profile}, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const {t} = useTranslation();

  const handleMakeAdmin = async () => {
    try {
      setIsLoading(true);
      await onMakeAdmin();
      Toast.show({
        type: 'success',
        text1: t('groups.makeAdmin.successMessage'),
      });
      bottomSheetClose(ref);
    } catch (error) {
      console.error('Failed to grant admin privileges:', error);
      Toast.show({
        type: 'error',
        text1: t('groups.makeAdmin.errorMessage'),
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
            {t('groups.makeAdmin.title')}
          </ThemedText>
          <ThemedText className="text-center text-base text-muted-foreground mb-6">
            {t('groups.makeAdmin.description', {
              handle: profile?.handle,
            })}
          </ThemedText>
        </View>

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleMakeAdmin}
          disabled={isLoading}
          confirmText={
            isLoading
              ? t('groups.makeAdmin.loading')
              : t('groups.makeAdmin.confirm')
          }
          variant="default"
        />
      </View>
    </BaseSheet>
  );
});
