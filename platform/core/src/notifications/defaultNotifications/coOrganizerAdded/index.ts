import {
  ExpandedNotification,
  NotificationHandler,
  notificationAll,
  PostWithMeta,
} from '@openpeepshq/common/types';

import { findProfile } from '@openpeepshq/core/profiles';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { profileName } from '@openpeepshq/common/lib';
import { hub } from '../../../events';
import { initI18nEmailContext } from '../../../i18n';
import { PUSH_INVALIDATE } from '../../pushInvalidation';
import { coOrganizersAddedToNotify } from './recipients';

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.filter((id): id is string => typeof id === 'string')
    : [];

const notifyAdded = async (post: PostWithMeta, previous: string[]) => {
  const current =
    post.data?.type === 'event' ? (post.data.coOrganizers ?? []) : [];
  const ids = coOrganizersAddedToNotify(current, previous, post.profile.id);
  for (const profileId of ids) {
    const profile = await findProfile(profileId);
    if (!profile) continue;
    await maybeCreateNotification(profile, {
      type: 'coOrganizerAdded',
      fromProfileId: post.profile.id,
      postId: post.id,
    });
  }
};

/** Co-organizers named when the event is first created. */
const createdHandler = async (postArg: unknown) => {
  await notifyAdded(postArg as PostWithMeta, []);
};

/** 2nd arg = previous jam-moderator ids, 3rd arg = previous co-organizer ids. */
const updatedHandler = async (
  postArg: unknown,
  _previousJam: unknown,
  previousCoOrganizersArg: unknown,
) => {
  await notifyAdded(
    postArg as PostWithMeta,
    asStringArray(previousCoOrganizersArg),
  );
};

// `postCreated` is registered by `registerNotificationHandler` (via the
// `event` field); `postUpdated` is registered here so removal/addition can be
// diffed against the previous list. `hub.on` (not `hub.once`) is required:
// notifications must fire on every co-organizer change, and `hub.once` would
// unsubscribe after the first `postUpdated` since startup.
hub.on('postUpdated', updatedHandler);

const pushRenderer = async (notification: ExpandedNotification) => {
  const { t } = await initI18nEmailContext();
  return {
    title: `${profileName(notification.senderProfile!)} added you as a co-organizer`,
    options: {
      body:
        notification.post?.data?.type === 'event'
          ? notification.post.data.name
          : undefined,
      actions: [
        {
          action: `goto:/posts/${notification.post?.id}`,
          title: t('emails.coOrganizerAdded.cta'),
        },
      ],
    },
    invalidateQueries: [PUSH_INVALIDATE.posts],
  };
};

export default {
  event: 'postCreated',
  type: 'coOrganizerAdded',
  eventHandler: createdHandler,
  pushRenderer,
  defaultSettings: notificationAll,
} satisfies NotificationHandler;
