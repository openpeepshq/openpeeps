import {
  ExpandedNotification,
  PostWithMeta,
  NotificationHandler,
  Event,
  notificationAll,
} from '@openpeeps/common/types';

import { findProfile } from '@openpeeps/core/profiles';
import { maybeCreateNotification } from '@openpeeps/core/notifications';
import { profileName } from '@openpeeps/common/lib';
import { initI18nEmailContext } from '../../../i18n';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

const eventHandler = async (eventData: unknown) => {
  const post = eventData as PostWithMeta;
  const jam = post.data?.type === 'event' && post.data?.jam;
  if (!jam) {
    return;
  }

  if (jam.moderators)
    for (const profileId of jam.moderators) {
      const profile = await findProfile(profileId);
      if (profile && post.profile.id !== profileId) {
        await maybeCreateNotification(profile, {
          type: 'jamModerator',
          fromProfileId: post.profile.id,
          postId: post.id,
        });
      }
    }
};

const pushRenderer = async (notification: ExpandedNotification) => {
  const { t } = await initI18nEmailContext();
  return {
    title: `${profileName(notification.senderProfile!)} invited you to moderate a jam`,
    options: {
      body: (notification.post?.data as Event).name,
      actions: [
        {
          action: `goto:/posts/${notification.post?.id}`,
          title: t('emails.jamModerator.cta'),
        },
      ],
    },
    invalidateQueries: [PUSH_INVALIDATE.posts],
  };
};

export default {
  event: 'postCreated',
  type: 'jamModerator',
  eventHandler,
  pushRenderer,
  defaultSettings: notificationAll,
} satisfies NotificationHandler;
