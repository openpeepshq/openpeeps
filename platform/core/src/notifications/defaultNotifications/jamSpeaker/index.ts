import {
  ExpandedNotification,
  PostWithMeta,
  NotificationHandler,
  Event,
  notificationAll,
} from '@openpeepshq/common/types';

import { findProfile } from '@openpeepshq/core/profiles';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { profileName } from '@openpeepshq/common/lib';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

const eventHandler = async (eventData: unknown) => {
  const post = eventData as PostWithMeta;
  const jam = post.data?.type === 'event' && post.data?.jam;
  if (!jam) {
    return;
  }

  if (jam.speakers)
    for (const speaker of jam.speakers) {
      const speakerProfile = await findProfile(speaker);
      if (speakerProfile && post.profile.id !== speaker) {
        await maybeCreateNotification(speakerProfile, {
          type: 'jamSpeaker',
          fromProfileId: post.profile.id,
          postId: post.id,
        });
      }
    }
};

const pushRenderer = async (notification: ExpandedNotification) => ({
  title: `${profileName(notification.senderProfile!)} invited you to speak at a jam`,
  options: {
    body: (notification.post?.data as Event).name,
    actions: [
      {
        action: `goto:/events/${notification.post?.id}/jam`,
        title: 'Join Jam',
      },
    ],
  },
  invalidateQueries: [PUSH_INVALIDATE.posts],
});

export default {
  event: 'postCreated',
  type: 'jamSpeaker',
  eventHandler,
  pushRenderer,
  defaultSettings: notificationAll,
} satisfies NotificationHandler;
