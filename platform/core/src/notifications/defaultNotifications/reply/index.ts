import {
  ExpandedNotification,
  PostWithMeta,
  NotificationHandler,
  PublicProfile,
  notificationAll,
} from '@openpeeps/common/types';
import { findPost } from '@openpeeps/core/posts';
import { findProfile } from '@openpeeps/core/profiles';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

export default {
  type: 'reply',
  event: 'postCreated',
  defaultSettings: notificationAll,
  eventHandler: async (data: unknown) => {
    const post = data as PostWithMeta;

    if (post.data?.type === 'event') {
      return;
    }

    if (post.visibility === 'direct') {
      return;
    }

    if (!post.inReplyToId) {
      return;
    }

    const repliedPost = await findPost(post.inReplyToId);
    const targetProfile = await findProfile(
      (repliedPost?.profile as PublicProfile | undefined)?.id ?? '',
    );

    if (targetProfile && targetProfile.id !== post.profile.id) {
      await maybeCreateNotification(targetProfile, {
        type: 'reply',
        postId: post.inReplyToId,
        fromProfileId: post.profile.id,
        data: {
          replyPostId: post.id,
        },
      });
    }
  },
  expander: async (notification) =>
    ({
      ...notification,
      data: {
        replyPost: await findPost(
          (notification.data as { replyPostId: string }).replyPostId,
        ),
      },
    }) as ExpandedNotification,
  pushRenderer: async (notification) => ({
    title: `${profileName(notification.senderProfile!)} replied your post`,
    options: {
      body: notification.post?.data?.content,
      icon: getProfileAvatar(
        notification.senderProfile,
        await communityConfig(),
      ),
      actions: [
        {
          action: `goto:/posts/${notification.post?.id}`,
          title: 'Go to post',
        },
      ],
    },
    invalidateQueries: [PUSH_INVALIDATE.posts],
  }),
} satisfies NotificationHandler;
