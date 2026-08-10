import React from 'react';
import {
  ArrowLeftIcon,
  InfoIcon,
  ShareIcon,
  VideoIcon,
} from '~/components/icons';
import { ActivityIndicator, Pressable, Share, View } from 'react-native';
import { Button } from '~/components/ui/button';
import { ThemedSafeAreaView } from '~/components/ui/themed-safe-area-view';
import { AudioOutputList } from '~/components/custom/jam/pieces/audio-output-list';
import { Event, PublicPost } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { ThemedText } from '~/components/ui/themed-text';
import { DeviceSelectionForm } from './device-selection-form';
import { ProfileAvatar } from '../../profile/profile-avatar';
import { truncateText } from '~/lib/utils';
import { BASE_URL } from '~/lib/constants';
import { useEffect, useState } from 'react';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import { useJamLivekitStore } from '~/stores/useJamStore';

export const JamLobby = ({
  goBack,
  jamPost,
}: {
  goBack: () => void;
  jamPost: PublicPost;
}) => {
  const { t } = useTranslation();

  const { openpeepsApi, currentProfile } = useOpenpeeps();
  const jamEvent = jamPost.data as Event;
  const jamId = jamPost.id;

  const [canJoin, setCanJoin] = useState(false);

  const { data: jamState } = openpeepsApi.useJamState(jamId);

  const {
    data: jamTokenData,
    isLoading: isLoadingToken,
    error: tokenError,
    refetch: refetchToken,
  } = openpeepsApi.useJamToken(jamId);

  const connect = useJamLivekitStore(state => state.connect);

  useEffect(() => {
    if (
      jamState?.active ||
      (currentProfile && jamEvent.jam?.moderators.includes(currentProfile.id))
    ) {
      refetchToken();
      setCanJoin(true);
    }
  }, [currentProfile, jamState, jamEvent, refetchToken]);

  useEffect(() => {
    if (canJoin && tokenError) {
      Toast.show({
        text1: t('jams.join.error'),
        type: 'error',
      });
    }
  }, [canJoin, tokenError, t]);

  return (
    <ThemedSafeAreaView className="flex-1 bg-background">
      <View className="flex-row justify-between items-center p-4">
        <Button
          size="icon"
          onPress={goBack}
          variant="outline"
          className="w-12 h-10">
          <ArrowLeftIcon className="text-foreground" />
        </Button>
        <AudioOutputList />
      </View>

      {currentProfile && (
        <View className="flex-1">
          <View className="items-center mt-4">
            <ThemedText className="text-xl text-white font-medium">
              {jamEvent?.name || 'Jam'}
            </ThemedText>
          </View>

          <DeviceSelectionForm />

          <View className="border-t h-56 border-muted py-4">
            <View className="flex-row justify-between items-center mt-2 px-4">
              <View className="flex-row items-center">
                <InfoIcon size={20} className="text-foreground" />
                <ThemedText className="text-lg ml-2 font-medium">
                  Join info
                </ThemedText>
              </View>
              <Pressable
                className="p-2"
                onPress={() => {
                  Share.share({
                    message: `Join ${truncateText(
                      jamEvent?.name || '-',
                      20,
                    )} happening at ${BASE_URL}/events/${jamId}/jam`,
                  });
                }}>
                <ShareIcon size={20} className="text-foreground" />
              </Pressable>
            </View>

            <View className="px-4 pl-12 mt-4">
              <ThemedText className="text-lg text-muted-foreground">
                Meeting link
              </ThemedText>
              <ThemedText className="mt-2">
                {BASE_URL}/events/${jamId}/jam
              </ThemedText>
            </View>
          </View>

          {canJoin ? (
            <View className=" p-5 border-t h-44 items-center w-full border-muted">
              <Button
                size={'lg'}
                className="w-32 bg-foreground"
                onPress={async () => {
                  if (jamTokenData?.token) {
                    connect(jamTokenData.token, jamTokenData.livekitUrl);
                  } else {
                    Toast.show({
                      text1: t('jams.join.error'),
                      type: 'error',
                    });
                  }
                }}>
                {isLoadingToken ? (
                  <ActivityIndicator />
                ) : (
                  <View className="flex-row items-center">
                    <VideoIcon size={20} className="text-background" />
                    <ThemedText className=" ml-2">
                      {jamState?.active
                        ? t('jams.join.submit')
                        : t('jams.start.submit')}
                    </ThemedText>
                  </View>
                )}
              </Button>
              <View className="items-center mt-5">
                <ThemedText className="text-muted-foreground">
                  Joining as
                </ThemedText>
                <View className="flex-row items-center mt-4">
                  <ProfileAvatar profile={currentProfile} />
                  <ThemedText className="">
                    {truncateText(
                      currentProfile?.displayName ||
                      `@${currentProfile?.handle}`,
                      20,
                    )}
                  </ThemedText>
                </View>
              </View>
            </View>
          ) : (
            <View className=" p-5 border-t h-44 items-center w-full border-muted">
              <ThemedText className="text-muted-foreground">
                Jam is not active
              </ThemedText>
            </View>
          )}
        </View>
      )}
    </ThemedSafeAreaView>
  );
};
