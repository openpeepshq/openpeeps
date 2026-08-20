import React, {forwardRef} from 'react';
import {View} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemedText} from '~/components/ui/themed-text';
import {Profile} from '@openpeepshq/common';
import {BaseSheet, SheetFooter} from '../common';
import Toast from 'react-native-toast-message';
import {useTranslation} from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface RemoveAdminPrivilegesFromMemberConfirmationSheetProps {
  onRemovePrivileges: () => Promise<void>;
  profile: Profile;
}

export const RemoveAdminPrivilegesFromMemberConfirmationSheet = forwardRef<
  BottomSheetModal,
  RemoveAdminPrivilegesFromMemberConfirmationSheetProps
>(({onRemovePrivileges, profile}, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const {t} = useTranslation();

  const handleRemovePrivileges = async () => {
    try {
      setIsLoading(true);
      await onRemovePrivileges();
      Toast.show({
        type: 'success',
        text1: t('groups.removeAdmin.successMessage'),
      });
      bottomSheetClose(ref);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('groups.removeAdmin.errorMessage'),
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
            {t('groups.removeAdmin.title')}
          </ThemedText>
          <ThemedText className="text-center text-base text-muted-foreground mb-6">
            {t('groups.removeAdmin.description', {
              handle: profile?.handle,
            })}
          </ThemedText>
        </View>

        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleRemovePrivileges}
          disabled={isLoading}
          confirmText={
            isLoading
              ? t('groups.removeAdmin.confirm')
              : t('groups.removeAdmin.loading')
          }
          variant="destructive"
        />
      </View>
    </BaseSheet>
  );
});
