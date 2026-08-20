import React, { forwardRef, useEffect } from 'react';
import { ActivityIndicator, TouchableOpacity, View } from 'react-native';
import { BottomSheetModal } from '@gorhom/bottom-sheet';
import { ThemedText } from '~/components/ui/themed-text';
import { DoorOpenIcon, CircleSlash2Icon } from '~/components/icons';
import { MetadataType } from '~/types';
import { Profile } from '@openpeepshq/common';
import { truncateText } from '~/lib/utils';
import { useJamStore } from '~/stores/useJamStore';
import { Participant } from 'livekit-client';
import Toast from 'react-native-toast-message';
import { BaseSheet } from '../common';
import { useTranslation } from 'react-i18next';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { bottomSheetClose, bottomSheetDismiss } from '~/lib/bottom-sheet-ref';


interface WaitingRoomActionSheetProps {
  participantMetdata: MetadataType;
  participant: Participant;
  onAdmit?: () => Promise<void>;
  onReject?: () => Promise<void>;
}

export const WaitingRoomActionSheet = forwardRef<
  BottomSheetModal,
  WaitingRoomActionSheetProps
>(({ participantMetdata, participant, onAdmit, onReject }, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [profile, setProfile] = React.useState<Profile | undefined>(undefined);
  const { jam } = useJamStore();
  const { t } = useTranslation();

  const handleAdmitParticipant = async () => {
    if (!participant || !jam) { return; }

    try {
      setIsLoading(true);
      await onAdmit?.();
      Toast.show({
        type: 'success',
        text1: t('jams.waitingRoom.admitSuccess'),
      });
      bottomSheetClose(ref);
    } catch (error) {
      console.error('Failed to admit participant:', error);
      Toast.show({
        type: 'error',
        text1: t('jams.waitingRoom.admitError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRejectParticipant = async () => {
    if (!participant || !jam) { return; }

    try {
      setIsLoading(true);
      await onReject?.();
      Toast.show({
        type: 'success',
        text1: t('jams.waitingRoom.rejectSuccess'),
      });
      bottomSheetClose(ref);
    } catch (error) {
      console.error('Failed to reject participant:', error);
      Toast.show({
        type: 'error',
        text1: t('jams.waitingRoom.rejectError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setProfile(participantMetdata.profile);
  }, [participantMetdata]);

  return (
    <BaseSheet ref={ref}>
      <View className="flex-1 p-4">
        <View className="items-center">
          <View className="flex-row items-center mb-6">
            <ProfileAvatar profile={profile as Profile} />
            <ThemedText className="ml-4 text-lg font-medium">
              {truncateText(profile?.displayName || `@${profile?.handle}`, 30)}
            </ThemedText>
          </View>

          <TouchableOpacity
            onPress={handleAdmitParticipant}
            disabled={isLoading}
            className="w-full px-4 py-3 flex-row items-center gap-x-3 rounded-lg hover:bg-surface/50">
            {!isLoading ? (
              <>
                <DoorOpenIcon className="text-foreground" />
                <ThemedText className="text-lg">{t('jams.waitingRoom.admitParticipant')}</ThemedText>
              </>
            ) : (
              <>
                <ActivityIndicator size="small" />
                <ThemedText className="text-lg">{t('jams.waitingRoom.admitting')}</ThemedText>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleRejectParticipant}
            disabled={isLoading}
            className="mt-2 w-full px-4 py-3 flex-row items-center gap-x-3 rounded-lg hover:bg-surface/50">
            <CircleSlash2Icon className="text-destructive" />
            <ThemedText className="text-lg text-destructive">
              {t('jams.waitingRoom.rejectParticipant')}
            </ThemedText>
          </TouchableOpacity>
          {/* <SheetFooter
            onCancel={handleRejectParticipant}
            onConfirm={handleAdmitParticipant}
            disabled={isLoading}
            cancelText={t('jams.waitingRoom.rejectParticipant')}
            confirmText={isLoading ? t('jams.waitingRoom.admitting') : t('jams.waitingRoom.admitParticipant')}
            variant="destructive"
          /> */}
        </View>
      </View>
    </BaseSheet>
  );
});
