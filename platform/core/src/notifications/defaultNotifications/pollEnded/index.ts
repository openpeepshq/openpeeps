import type {
  ExpandedNotification,
  NotificationHandler,
  PostWithMeta,
} from '@openpeepshq/common/types';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { getProfileAvatar } from '@openpeepshq/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';
import { pollEndedRecipientProfiles } from './recipients';

const eventHandler = async (data: unknown) => {
  const post = data as PostWithMeta;
  if (post.data?.type !== 'question') {
    return;
  }

  const fromProfileId = post.profile?.id;
  for (const recipient of pollEndedRecipientProfiles(post)) {
    await maybeCreateNotification(recipient, {
      type: 'pollEnded',
      postId: post.id,
      ...(fromProfileId ? { fromProfileId } : {}),
    });
  }
};

const pushRenderer = async (notification: ExpandedNotification) => ({
  title: 'A poll has ended',
  options: {
    body: notification.post?.data?.content,
    icon: getProfileAvatar(
      notification.senderProfile ?? notification.post?.profile,
      await communityConfig(),
    ),
    actions: [
      {
        action: `goto:/posts/${notification.post?.id}`,
        title: 'See Results',
      },
    ],
  },
  invalidateQueries: [PUSH_INVALIDATE.posts],
});

export default {
  type: 'pollEnded',
  event: 'pollEnded',
  eventHandler,
  pushRenderer,
} satisfies NotificationHandler;
