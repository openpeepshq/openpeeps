import type {
  EntryData,
  ExpandedNotification,
  PostWithMeta,
  NotificationHandler,
  Profile,
} from '@openpeeps/common/types';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { getProfileAvatar, profileName } from '@openpeeps/common/lib';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

const eventHandler = async (
  senderProfile: unknown,
  post: unknown,
  data: unknown,
) => {
  const mergedPost = post as PostWithMeta;
  const fromProfile = senderProfile as Profile;
  const entryData = data as EntryData;

  if (entryData.type !== 'answer') {
    return;
  }

  await maybeCreateNotification(mergedPost.profile, {
    type: 'pollVote',
    postId: mergedPost.id,
    fromProfileId: fromProfile.id,
  });
};

const pushRenderer = async (notification: ExpandedNotification) => ({
  title: `New vote on your poll by ${profileName(notification.senderProfile!)}`,
  options: {
    body: notification.post?.data?.content,
    icon: getProfileAvatar(notification.senderProfile, await communityConfig()),
    actions: [
      {
        action: `goto:/posts/${notification.post?.id}`,
        title: 'View Poll',
      },
    ],
  },
  invalidateQueries: [PUSH_INVALIDATE.posts],
});

export default {
  type: 'pollVote',
  event: 'entryCreated',
  eventHandler,
  pushRenderer,
} satisfies NotificationHandler;
