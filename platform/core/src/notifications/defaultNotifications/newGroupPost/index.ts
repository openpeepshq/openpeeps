import {
  ExpandedNotification,
  PostWithMeta,
  NotificationHandler,
  GroupWithMeta,
  notificationAll,
} from '@openpeeps/common/types';
import { listGroupMembers } from '@openpeeps/core/profiles';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { getGroupAvatar, profileName } from '@openpeeps/common/lib';
import { communityConfig } from '../../../config';

const eventHandler = async (data: unknown) => {
  const post = data as PostWithMeta;

  if (!post.group) {
    return;
  }

  const group = post.group;

  for (const groupMember of await listGroupMembers(group).then((members) =>
    members
      .map((m) => m.profile)
      .filter((profile) => post.profile.id !== profile.id),
  )) {
    await maybeCreateNotification(groupMember, {
      type: 'newGroupPost',
      fromProfileId: post.profile.id,
      postId: post.id,
      groupId: group.id,
    });
  }
};

const pushRenderer = async (notification: ExpandedNotification) => ({
  title: `${profileName(notification.post?.profile)} made a post in ${notification?.group?.displayName}`,
  options: {
    body: notification.post?.data?.content,
    icon: getGroupAvatar(
      notification.group as GroupWithMeta,
      await communityConfig(),
    ),
    actions: [
      {
        action: `goto:/groups/@${notification.group?.handle}`,
        title: 'Go to post',
      },
    ],
  },
});

export default {
  type: 'newGroupPost',
  event: 'postCreated',
  eventHandler,
  pushRenderer,
  defaultSettings: notificationAll,
} satisfies NotificationHandler;
