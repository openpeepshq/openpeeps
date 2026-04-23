import React, { forwardRef, useEffect, useState } from 'react';
import { View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '~/components/ui/themed-text';
import { useOpenpeeps } from '@openpeeps/react';
import { useJamLivekitStore, useJamStore } from '~/stores/useJamStore';
import Toast from 'react-native-toast-message';
import { useRoomContext } from '@livekit/react-native';
import { MetadataType } from '~/types';
import { Profile } from '@openpeeps/common';
import { BaseSheet, SheetFooter } from '../common';
import { useTranslation } from 'react-i18next';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';

interface ExitJamOptionsSheetProps {
  handleGoBack: () => void;
}

export const ExitJamOptionsSheet = forwardRef<
  BottomSheetModal,
  ExitJamOptionsSheetProps
>(({ handleGoBack }, ref) => {
  const room = useRoomContext();
  const { openpeepsApi } = useOpenpeeps();
  const [profile, setProfile] = useState<Profile | undefined>();
  const { jam, jamPost, clearJamStore } = useJamStore();
  const closeJam = openpeepsApi.closeJamAction({ id: jamPost?.id || '' });
  const [isLoading, setIsLoading] = useState(false);
  const { t } = useTranslation();
  const disconnect = useJamLivekitStore(state => state.disconnect);
  const handleLeaveJam = async () => {
    try {
      setIsLoading(true);
      disconnect();
      clearJamStore();
      await room.disconnect();
      handleGoBack();
      bottomSheetClose(ref);
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('jam.exit.error'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleCloseJam = async () => {
    try {
      setIsLoading(true);
      await closeJam();
      Toast.show({
        type: 'success',
        text1: t('jam.close.success'),
      });
      disconnect();
      clearJamStore();
      bottomSheetClose(ref);
      handleGoBack();
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('jam.close.error'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const p = JSON.parse(
      room.localParticipant.metadata || '{}',
    ) as MetadataType;
    setProfile(p.profile);
  }, [room]);

  const isModerator = jam?.moderators.includes(profile?.id as string);

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 p-4">
        <View className="items-center">
          <ThemedText className="text-lg font-semibold">
            {t('jam.exit.title')}
          </ThemedText>
          <ThemedText className="mt-4 mb-5 text-base text-muted-foreground text-center">
            {t('jam.exit.description')}
          </ThemedText>

          {isModerator ? (
            <View className="w-full">
              <SheetFooter
                onCancel={handleLeaveJam}
                onConfirm={handleCloseJam}
                disabled={isLoading}
                cancelText={t('jam.exit.leave')}
                confirmText={t('jam.exit.endForAll')}
                variant="destructive"
              />
            </View>
          ) : (
            <View className="w-full">
              <SheetFooter
                onCancel={() => bottomSheetClose(ref)}
                onConfirm={handleLeaveJam}
                disabled={isLoading}
                confirmText={t('jam.exit.leave')}
                variant="destructive"
              />
            </View>
          )}
        </View>
      </View>
    </BaseSheet>
  );
});
