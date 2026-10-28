import { Pressable, View } from 'react-native';
import React from 'react';
import { PublicNotification } from '@openpeepshq/common';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { MainStackParamList } from '../../components/navigation/types/index';
import {
  Announcement,
  DirectMessage,
  Follow,
  GroupMemberExit,
  JamModerator,
  JamSpeaker,
  JamStarted,
  NewGroupInvitation,
  NewGroupMember,
  NewProfile,
  PollVote,
  PollEnded,
  Reply,
  Mention,
  Repost,
  Reaction,
  Rsvp,
  RsvpCanceled,
  WaitlistOffer,
} from './types';
import { ThemedText } from '../ui/themed-text';
import { NewGroupPost } from './types/NewGroupPost';
import { NotificationErrorBoundary } from './NotificationErrorBoundary';

interface NotificationComponentProps {
  notification: PublicNotification;
}

const notificationComponentMap: Record<
  PublicNotification['type'],
  React.ComponentType<{ notification: PublicNotification }>
> = {
  announcement: Announcement,
  directMessage: DirectMessage,
  follow: Follow,
  groupMemberLeft: GroupMemberExit,
  jamModerator: JamModerator,
  jamSpeaker: JamSpeaker,
  jamStarted: JamStarted,
  groupAdded: NewGroupInvitation,
  groupMemberJoined: NewGroupMember,
  newGroupPost: NewGroupPost,
  newProfile: NewProfile,
  pollVote: PollVote,
  pollEnded: PollEnded,
  reply: Reply,
  mention: Mention,
  repost: Repost,
  reaction: Reaction,
  rsvp: Rsvp,
  rsvpCanceled: RsvpCanceled,
  waitlistOffer: WaitlistOffer,
};

export const NotificationItem: React.FC<NotificationComponentProps> = ({
  notification,
}) => {
  const navigation =
    useNavigation<NativeStackNavigationProp<MainStackParamList>>();
  const NotificationToRender: React.ComponentType<{
    notification: PublicNotification;
  }> = notificationComponentMap[notification.type];

  if (!NotificationToRender) {
    return (
      <View className="p-4">
        <ThemedText className="font-bold text-destructive">
          Unknown notification type: {notification.type}
        </ThemedText>
      </View>
    );
  }

  const PostBody = (
    <NotificationErrorBoundary notificationId={notification.id}>
      <View className="flex w-full items-center justify-between border-b">
        <NotificationToRender notification={notification} />
      </View>
    </NotificationErrorBoundary>
  );

  if (notification.post?.id) {
    return (
      <Pressable
        onPress={() =>
          navigation.navigate('Post', {
            id: notification.post!.id,
            occurrence: notification.post?.occurrenceRecurrenceId ?? undefined,
          })
        }
      >
        {PostBody}
      </Pressable>
    );
  }

  return PostBody;
};
