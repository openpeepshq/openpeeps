import {
  ExpandedNotification,
  PostWithMeta,
  NotificationHandler,
  GroupWithMeta,
  notificationAll,
} from '@openpeepshq/common/types';
import { listGroupMembers } from '@openpeepshq/core/profiles';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { getGroupAvatar, profileName } from '@openpeepshq/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';
import { newGroupPostRecipients } from './recipients';

const eventHandler = async (data: unknown) => {
  const post = data as PostWithMeta;

  if (!post.group) {
    return;
  }

  const group = post.group;
  const members = (await listGroupMembers(group)).map((m) => m.profile);

  for (const groupMember of newGroupPostRecipients(post, members)) {
    await maybeCreateNotification(groupMember, {
      type: 'newGroupPost',
      fromProfileId: post.profile.id,
      postId: post.id,
      groupId: group.id,
    });
  }
};

const pushRenderer = async (notification: ExpandedNotification) => {
  const isRepost = !!notification.post?.repost;
  const preview = notification.post?.repost ?? notification.post;
  const name = profileName(notification.post?.profile);
  const group = notification.group?.displayName;
  return {
    title: isRepost
      ? `${name} reposted a post in ${group}`
      : `${name} made a post in ${group}`,
    options: {
      body: preview?.data?.content,
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
    invalidateQueries: [PUSH_INVALIDATE.posts, PUSH_INVALIDATE.unseenCounts],
  };
};

export default {
  type: 'newGroupPost',
  event: 'postCreated',
  eventHandler,
  pushRenderer,
  defaultSettings: notificationAll,
} satisfies NotificationHandler;
