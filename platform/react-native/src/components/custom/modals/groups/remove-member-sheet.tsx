import React, {forwardRef} from 'react';
import {View} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemedText} from '~/components/ui/themed-text';
import {BaseSheet, SheetFooter} from '../common';
import {Profile} from '@openpeepshq/common';
import {useTranslation} from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface RemoveMemberSheetProps {
  onRemove: () => Promise<void>;
  profile: Profile;
}

export const RemoveMemberSheet = forwardRef<
  BottomSheetModal,
  RemoveMemberSheetProps
>(({onRemove, profile}, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const {t} = useTranslation();

  const handleRemove = async () => {
    setIsLoading(true);
    try {
      await onRemove();
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
            {t('groups.removeMember.title')}
          </ThemedText>
        </View>
        <View className="items-center justify-center">
          <ThemedText className="p-4 text-center">
            {t('groups.removeMember.description', {
              handle: profile?.handle,
            })}{' '}
          </ThemedText>
        </View>
        <SheetFooter
          onCancel={() => bottomSheetClose(ref)}
          onConfirm={handleRemove}
          confirmText={
            isLoading
              ? t('groups.removeMember.loading')
              : t('groups.removeMember.confirm')
          }
          disabled={isLoading}
        />
      </View>
    </BaseSheet>
  );
});
