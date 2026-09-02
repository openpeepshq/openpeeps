import { Share, View } from 'react-native';
import React, { useRef } from 'react';
import { Trash2Icon, ShareIcon } from '~/components/icons';
import { Button } from '~/components/ui/button';
import { ThemedText } from '~/components/ui/themed-text';
import { DeleteJamSheet, DeleteJamSheetRef } from '../modals';
import { Event, PublicPost } from '@openpeepshq/common';
import { useOpenpeeps } from '@openpeepshq/react';
import { useTranslation } from 'react-i18next';
import { BASE_URL } from '~/lib/constants';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';

interface JamActionsFooterProps {
  handleOpenJam?: () => void;
  jamPost: PublicPost;
}
export const JamActionsFooter = ({ jamPost }: JamActionsFooterProps) => {
  const deleteJamSheetRef = useRef<DeleteJamSheetRef>(null);

  const { t } = useTranslation();
  const { openpeepsApi } = useOpenpeeps();

  const { data: jamState } = openpeepsApi.useJamState(jamPost.id);
  const { data: serverInfo } = openpeepsApi.useServerInfo();
  const livekitEnabled = serverInfo?.jams.livekit.enabled;

  const { currentProfile } = useOpenpeeps();
  const jamEvent = jamPost.data as Event;
  const jam = jamEvent.jam;
  const handleDeletePress = () => {
    deleteJamSheetRef.current?.present();
  };
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const isModerator = jam?.moderators.includes(currentProfile?.id as string);

  return (
    <View className="">
      <View className=" items-center flex flex-row justify-between">
        <View className="flex flex-row gap-x-2">
          <Button
            variant={'ghost'}
            size={'icon'}
            onPress={() => {
              Share.share({
                message: t('posts.actions.shareMessage'),
                url: `${BASE_URL}/events/${jamPost.id}/jam`,
              });
            }}
          >
            <ShareIcon className="text-foreground" size={18} />
          </Button>
          {jamPost.profile.id === currentProfile?.id && (
            <>
              {/* <Button variant={'ghost'} size={'icon'} onPress={() => {}}>
                <PencilLineIcon className="text-foreground" size={18} />
              </Button> */}

              <Button
                variant={'ghost'}
                size={'icon'}
                onPress={handleDeletePress}
              >
                <Trash2Icon className="text-foreground" size={18} />
              </Button>
            </>
          )}
        </View>
        {livekitEnabled === false ? (
          <ThemedText className="text-destructive text-sm flex-1">
            {t('jams.unavailable.message')}
          </ThemedText>
        ) : livekitEnabled && (jamState?.active || isModerator) ? (
          <Button
            variant={'outline'}
            onPress={() => {
              navigation.navigate('JamSession', {
                jamId: jamPost.id,
              });
            }}
            className={`${isModerator ? 'flex-1' : ''}`}
          >
            <ThemedText>
              {!jamState?.active
                ? t('jams.start.submit')
                : t('jams.join.submit')}
            </ThemedText>
          </Button>
        ) : null}
      </View>

      <DeleteJamSheet ref={deleteJamSheetRef} />
    </View>
  );
};
