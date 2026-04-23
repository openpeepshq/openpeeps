import { Pressable, View } from 'react-native';
import React from 'react';
import { ThemedText } from '../../../ui/themed-text';
import { NotificationWrapper } from '../NotificationWrapper';
import { PublicNotification } from '@openpeeps/common';
import { ChartColumnIcon } from '../../../icons';
import { profileName } from '../../../../lib/utils';
import { useTranslation } from 'react-i18next';
import { MainStackParamList } from '../../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { FeedPost } from '../../post';

interface NotificationTypeProps {
  notification: PublicNotification;
}

export const PollVote: React.FC<NotificationTypeProps> = ({ notification }) => {
  const profile = notification.senderProfile!;
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}>
      <Pressable
        onPress={() =>
          navigation.navigate('Post', { id: notification.post?.id as string })
        }
        className="w-full">
        <View className="flex w-full items-center justify-between">
          <View className="mb-2 flex flex-row items-center gap-2 font-semibold flex-wrap">
            <ChartColumnIcon className="h-4 w-4 text-foreground" />
            <ThemedText>
              {t('notification.pollVote.text', {
                profileName: profileName(profile),
              })}{' '}
            </ThemedText>
          </View>
        </View>
        {notification.post && <FeedPost post={notification.post} />}
      </Pressable>
    </NotificationWrapper>
  );
};
