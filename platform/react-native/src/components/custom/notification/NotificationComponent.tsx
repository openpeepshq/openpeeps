import { View } from 'react-native';
import React from 'react';
import { PublicNotification } from '@openpeeps/common';
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
  Reply,
  Mention,
  Repost,
  Reaction,
} from './types';
import { ThemedText } from '~/components/ui/themed-text';
import { NewGroupPost } from './types/NewGroupPost';

interface NotificationComponentProps {
  notification: PublicNotification;
}

const notificationComponentMap: Record<PublicNotification['type'], React.ComponentType<{ notification: PublicNotification }>> = {
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
  reply: Reply,
  mention: Mention,
  repost: Repost,
  reaction: Reaction,
};

export const NotificationComponent: React.FC<NotificationComponentProps> = ({
  notification,
}) => {
  const NotificationToRender: React.ComponentType<{ notification: PublicNotification }> = notificationComponentMap[notification.type];

  if (!NotificationToRender) {
    return (
      <View className="p-4">
        <ThemedText className="text-red-500 font-bold">
          Unknown notification type: {notification.type}
        </ThemedText>
      </View>
    );
  } else {
    return (
      <View className="flex w-full items-center justify-between border-b">
        <NotificationToRender notification={notification} />
      </View>
    );
  }
};
