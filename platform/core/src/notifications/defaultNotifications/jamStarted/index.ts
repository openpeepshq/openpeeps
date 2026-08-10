import type {
  ExpandedNotification,
  NotificationHandler,
  PostWithMeta,
  Event,
  ProfileWithMeta,
} from '@openpeepshq/common/types';

import {
  listProfiles,
  listGroupMembers,
  findProfile,
} from '@openpeepshq/core/profiles';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { profileName } from '@openpeepshq/common/lib';
import { PUSH_INVALIDATE } from '../../pushInvalidation';

const eventHandler = async (...args: unknown[]) => {
  const [profile, post] = args as [ProfileWithMeta, PostWithMeta];
  const jam = post.data?.type === 'event' && post.data?.jam;

  if (!jam) {
    return;
  }

  if (['local', 'public'].includes(post.visibility)) {
    for (const recipientProfile of await listProfiles()) {
      if (profile.id !== recipientProfile?.id) {
        await maybeCreateNotification(recipientProfile, {
          type: 'jamStarted',
          fromProfileId: profile.id,
          postId: post.id,
        });
      }
    }
    return;
  }

  const recipients = new Set<ProfileWithMeta>();
  const skipRecipient = (recipient?: ProfileWithMeta) =>
    !profile ||
    !recipient ||
    profile.id === recipient?.id ||
    recipients.has(recipient);

  if (jam.moderators) {
    for (const id of [...jam.moderators, ...(jam.speakers || [])]) {
      const moderatorProfile = await findProfile(id);
      if (skipRecipient(moderatorProfile)) continue;
      recipients.add(moderatorProfile!);
    }
  }
  if (post.audience) {
    for (const audience of post.audience) {
      const audienceProfile = await findProfile(audience?.id!);
      if (skipRecipient(audienceProfile)) continue;
      recipients.add(audienceProfile!);
    }
  }
  if (post.visibility === 'group' && post.group) {
    for (const { profile: recipient } of await listGroupMembers(post.group)) {
      const recipientProfile = await findProfile(recipient?.id!);
      if (skipRecipient(recipientProfile)) continue;
      recipients.add(recipientProfile!);
    }
  }

  for (const recipientProfile of recipients) {
    await maybeCreateNotification(recipientProfile, {
      type: 'jamStarted',
      fromProfileId: profile.id,
      postId: post.id,
    });
  }
};

const pushRenderer = async (notification: ExpandedNotification) => ({
  title: `${profileName(notification.senderProfile!)} started a jam`,
  options: {
    body: (notification.post?.data as Event)?.name,
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
  event: 'jamStarted',
  type: 'jamStarted',
  eventHandler,
  pushRenderer,
} satisfies NotificationHandler;
