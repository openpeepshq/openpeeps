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
import { hub } from '../../../events';
import { initI18nEmailContext } from '../../../i18n';
import { PUSH_INVALIDATE } from '../../pushInvalidation';
import { jamModeratorsToNotify } from './recipients';

const notifyModerators = async (
  post: PostWithMeta,
  alreadyInvited: readonly string[],
) => {
  const jam = post.data?.type === 'event' ? post.data.jam : undefined;
  const profileIds = jamModeratorsToNotify(
    jam?.moderators,
    post.profile.id,
    alreadyInvited,
  );

  for (const profileId of profileIds) {
    const profile = await findProfile(profileId);
    if (!profile) continue;
    await maybeCreateNotification(profile, {
      type: 'jamModerator',
      fromProfileId: post.profile.id,
      postId: post.id,
    });
  }
};

const eventHandler = async (eventData: unknown) => {
  await notifyModerators(eventData as PostWithMeta, []);
};

/** Second arg is the moderator id list from before this save. */
const updatedHandler = async (postArg: unknown, previousArg: unknown) => {
  const previous = Array.isArray(previousArg)
    ? previousArg.filter((id): id is string => typeof id === 'string')
    : [];
  await notifyModerators(postArg as PostWithMeta, previous);
};

hub.once('postUpdated', updatedHandler);

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
