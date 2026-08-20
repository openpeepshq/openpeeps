import React from 'react';
import { Pressable, View } from 'react-native';
import { ThemedText } from '~/components/ui/themed-text';
import { PublicNotification } from '@openpeepshq/common';
import { NotificationWrapper } from '../NotificationWrapper';
import { AtSignIcon } from '~/components/icons';
import { profileName } from '~/lib/utils';
import { useTranslation } from 'react-i18next';
import { MainStackParamList } from '~/components/navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { FeedPost } from '../../post/feed/chronological/FeedPost';

interface NotificationTypeProps {
  notification: PublicNotification;
}

export const Mention: React.FC<NotificationTypeProps> = ({ notification }) => {
  const profile = notification.senderProfile!;
  const post = notification.post;
  const { t } = useTranslation();
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  return (
    <NotificationWrapper
      profile={profile}
      seen={notification.seen}
      showProfile={false}>
      <Pressable
        onPress={() => post && navigation.navigate('Post', { id: post.id })}
        className="w-full flex">
        <View className="flex w-full items-center justify-between">
          <View className="mb-2 flex flex-row items-center gap-2 font-semibold flex-wrap">
            <AtSignIcon className="h-4 w-4 text-foreground" />
            <ThemedText className="text-foreground">
              {t('notification.mention.text', {
                profileName: profileName(profile),
              })}
            </ThemedText>
          </View>
        </View>
        {post && (
          <FeedPost
            post={post}
            showReplyTo={false}
            showMenu={false}
            showReactionHeader={false}
          />
        )}
      </Pressable>
    </NotificationWrapper>
  );
};
