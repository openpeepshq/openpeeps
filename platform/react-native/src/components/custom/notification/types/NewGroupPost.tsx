import React from 'react';
import { Pressable } from 'react-native';
import { PublicNotification } from '@openpeeps/common';
import { NotificationWrapper } from '../NotificationWrapper';
import { MainStackParamList } from '../../../navigation/types';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useNavigation } from '@react-navigation/native';
import { FeedPost } from '../../post/feed/chronological/FeedPost';

interface NotificationTypeProps {
  notification: PublicNotification;
}
export const NewGroupPost: React.FC<NotificationTypeProps> = ({ notification }) => {
  const profile = notification.senderProfile!;
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();

  const { post } = notification;

  if (!post) {
    return null;
  }

  return (
    <NotificationWrapper
      profile={profile}
      group={notification.group || post.group}
      seen={notification.seen}
      showProfile={true}

    >
      <Pressable
        onPress={() => navigation.navigate('Post', { id: post.id })}
        className="w-full flex">

        <FeedPost post={post} showReplyTo={false} showMenu={false} />
      </Pressable>
    </NotificationWrapper>);
};
