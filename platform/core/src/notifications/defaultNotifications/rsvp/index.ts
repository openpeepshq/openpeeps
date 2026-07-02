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

  if (entryData.type !== 'rsvp') {
    return;
  }

  await maybeCreateNotification(mergedPost.profile, {
    type: 'rsvp',
    postId: mergedPost.id,
    fromProfileId: fromProfile.id,
  });
};

const pushRenderer = async (notification: ExpandedNotification) => ({
  title: `${profileName(notification.senderProfile!)} RSVP'd to your event`,
  options: {
    body: notification.post?.data?.content,
    icon: getProfileAvatar(notification.senderProfile, await communityConfig()),
    actions: [
      {
        action: `goto:/posts/${notification.post?.id}`,
        title: 'View RSVP',
      },
    ],
  },
  invalidateQueries: [PUSH_INVALIDATE.posts],
});

export default {
  type: 'rsvp',
  event: 'rsvpCreated',
  eventHandler,
  pushRenderer,
} satisfies NotificationHandler;
