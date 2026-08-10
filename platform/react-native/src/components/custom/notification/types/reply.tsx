import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '~/components/ui/themed-text';
import { PublicNotification, PublicPost } from '@openpeepshq/common';
import { NotificationWrapper } from '../NotificationWrapper';
import { ReplyIcon } from '~/components/icons';
import { profileName } from '~/lib/utils';
import { useTranslation } from 'react-i18next';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { FeedPost } from '../../post/feed/chronological/FeedPost';

interface NotificationTypeProps {
  notification: PublicNotification;
}
export const Reply: React.FC<NotificationTypeProps> = ({ notification }) => {
  const profile = notification.senderProfile!;
  const { replyPost } = notification.data as { replyPost: PublicPost };
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}>
      <Pressable
        onPress={() => navigation.navigate('Post', { id: replyPost.id })}
        className="w-full flex">
        <View className="flex w-full items-center justify-between">
          <View className="mb-2 flex flex-row items-center gap-2 font-semibold flex-wrap">
            <ReplyIcon className="h-4 w-4 text-foreground" />
            <ThemedText className="text-foreground">
              {t('notification.reply.text', {
                profileName: profileName(profile),
              })}
            </ThemedText>
          </View>
        </View>
        {replyPost && <FeedPost post={replyPost} showReplyTo={false} showMenu={false} showReactionHeader={false} />}
      </Pressable>
    </NotificationWrapper>
  );
};
