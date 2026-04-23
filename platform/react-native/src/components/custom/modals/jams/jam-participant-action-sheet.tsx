import React, {forwardRef, useEffect} from 'react';
import {ActivityIndicator, TouchableOpacity, View} from 'react-native';
import {BottomSheetModal} from '@gorhom/bottom-sheet';
import {ThemedText} from '~/components/ui/themed-text';
import {CameraOffIcon, MicOffIcon} from '~/components/icons';
import {MetadataType} from '~/types';
import {Profile} from '@openpeeps/common';
import { truncateText } from '~/lib/utils';
import {useOpenpeeps} from '@openpeeps/react';
import {useJamStore} from '~/stores/useJamStore';
import {Participant} from 'livekit-client';
import Toast from 'react-native-toast-message';
import {BaseSheet} from '../common';
import {useTranslation} from 'react-i18next';
import { ProfileAvatar } from '../../profile/profile-avatar';

interface JamParticipantActionSheetProps {
  participantMetdata: MetadataType;
  participant: Participant;
}

export const JamParticipantActionSheet = forwardRef<
  BottomSheetModal,
  JamParticipantActionSheetProps
>(({participantMetdata, participant}, ref) => {
  const [isLoading, setIsLoading] = React.useState(false);
  const [profile, setProfile] = React.useState<Profile | undefined>(undefined);
  const {openpeepsApi} = useOpenpeeps();
  const {jam, jamPost} = useJamStore();
  const muteParticipant = openpeepsApi.muteJamParticipantAction({
    id: jamPost?.id || '',
  });
  const {t} = useTranslation();

  const handleMuteParticipant = async () => {
    if (!participant || !jam) {return;}

    try {
      setIsLoading(true);
      const audioTrackPublication = participant
        .getTrackPublications()
        .find(
          trackPublication =>
            trackPublication.track && trackPublication.track.kind === 'audio',
        );

      if (!audioTrackPublication) {return;}

      await muteParticipant({
        identity: participant.identity,
        trackSid: audioTrackPublication.trackSid,
      });

      Toast.show({
        type: 'success',
        text1: t('jams.participants.muteSuccess'),
      });
    } catch (error) {
      console.error('Failed to mute participant:', error);
      Toast.show({
        type: 'error',
        text1: t('jams.participants.muteError'),
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleMuteParticipantCamera = async () => {
    if (!participant || !jam) {return;}

    try {
      setIsLoading(true);
      const cameraTrackPublications = participant
        .getTrackPublications()
        .filter(
          trackPublication =>
            trackPublication.track && trackPublication.track.kind === 'video',
        );

      if (!cameraTrackPublications?.length) {return;}

      await muteParticipant({
        identity: participant.identity,
        trackSid: cameraTrackPublications[0].trackSid,
      });

      Toast.show({
        type: 'success',
        text1: t('jams.participants.cameraOffSuccess'),
      });
    } catch (error) {
      console.error('Failed to turn off camera:', error);
      Toast.show({
        type: 'error',
        text1: t('jams.participants.cameraOffError'),
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
            <ProfileAvatar profile={profile as Profile}/>
            <ThemedText className="ml-4 text-lg font-medium">
              {truncateText(profile?.displayName || `@${profile?.handle}`, 30)}
            </ThemedText>
          </View>

          <TouchableOpacity
            onPress={handleMuteParticipant}
            disabled={isLoading}
            className="w-full px-4 py-3 flex-row items-center gap-x-3 rounded-lg hover:bg-muted/50">
            {!isLoading ? (
              <>
                <MicOffIcon className="text-foreground" />
                <ThemedText className="text-lg">
                  {t('jams.participant.muteParticipant')}
                </ThemedText>
              </>
            ) : (
              <>
                <ActivityIndicator size="small" />
                <ThemedText className="text-lg">
                  {t('jams.participants.muting')}
                </ThemedText>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            onPress={handleMuteParticipantCamera}
            disabled={isLoading}
            className="mt-2 w-full px-4 py-3 flex-row items-center gap-x-3 rounded-lg hover:bg-muted/50">
            <CameraOffIcon className="text-foreground" />
            <ThemedText className="text-lg">
              {t('jams.participant.turnOffCamera')}
            </ThemedText>
          </TouchableOpacity>
        </View>
      </View>
    </BaseSheet>
  );
});
