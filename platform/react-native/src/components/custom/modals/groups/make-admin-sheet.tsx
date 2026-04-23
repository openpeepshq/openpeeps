import React, {forwardRef} from 'react';
import {View} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemedText} from '../../../ui/themed-text';
import {BaseSheet, SheetFooter} from '../common';
import {Profile} from '@openpeeps/common';
import {useTranslation} from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '../../../../lib/bottom-sheet-ref';

interface MakeAdminSheetProps {
  onMakeAdmin: () => Promise<void>;
  profile: Profile;
}

export const MakeAdminSheet = forwardRef<BottomSheetModal, MakeAdminSheetProps>(
  ({onMakeAdmin, profile}, ref) => {
    const [isLoading, setIsLoading] = React.useState(false);
    const {t} = useTranslation();

    const handleMakeAdmin = async () => {
      setIsLoading(true);
      try {
        await onMakeAdmin();
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
              {t('groups.makeAdmin.title')}
            </ThemedText>
          </View>
          <View className="items-center justify-center">
            <ThemedText className="p-4 text-center">
              {t('groups.makeAdmin.description', {handle: profile.handle})}
            </ThemedText>
          </View>
          <SheetFooter
            onCancel={() => bottomSheetClose(ref)}
            onConfirm={handleMakeAdmin}
            confirmText={t('groups.makeAdmin.confirm')}
            disabled={isLoading}
          />
        </View>
      </BaseSheet>
    );
  },
);
