import type {
  ExpandedNotification,
  NotificationHandler,
  PostWithMeta,
  Profile,
  ProfileWithMeta,
} from '@openpeepshq/common/types';
import {
  getProfileAvatar,
  isRsvpCancelNotice,
  profileName,
  rsvpCancelWhenLabels,
} from '@openpeepshq/common/lib';
import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import { findProfile, listGroupMembers } from '@openpeepshq/core/profiles';
import { communityConfig } from '../../../config';
import { PUSH_INVALIDATE } from '../../pushInvalidation';
import { rsvpCancelRecipients } from './recipients';

const eventName = (post: PostWithMeta | null | undefined) =>
  post?.data?.type === 'event' ? post.data.name?.trim() : undefined;

const whenText = (
  post: PostWithMeta | null | undefined,
  notice: { occurrenceIds: string[]; series: boolean },
) => {
  if (!post) return '';
  const when = rsvpCancelWhenLabels(post, notice);
  if (when.series) return 'All dates in the series';
  return when.labels.join(', ');
};

const eventHandler = async (
  senderProfile: unknown,
  post: unknown,
  data: unknown,
) => {
  const mergedPost = post as PostWithMeta;
  const fromProfile = senderProfile as Profile;
  const cancel = (data as { cancel?: unknown } | undefined)?.cancel;
  if (!isRsvpCancelNotice(cancel)) return;
  if (mergedPost.type !== 'event' || mergedPost.data?.type !== 'event') {
    return;
  }

  const event = mergedPost.data;
  const moderatorIds = [
    ...(event.moderators ?? []),
    ...(event.jam?.moderators ?? []),
  ];
  const moderators = (
    await Promise.all(moderatorIds.map((id) => findProfile(id)))
  ).filter((profile): profile is ProfileWithMeta => !!profile);

  const groupAdmins = mergedPost.group
    ? (await listGroupMembers(mergedPost.group))
        .filter(
          (member) =>
            member.roles?.includes('owner') || member.roles?.includes('admin'),
        )
        .map((member) => member.profile)
    : [];

  const recipients = rsvpCancelRecipients(
    [mergedPost.profile, ...moderators, ...groupAdmins],
    fromProfile.id,
  );

  for (const recipient of recipients) {
    await maybeCreateNotification(recipient, {
      type: 'rsvpCanceled',
      postId: mergedPost.id,
      fromProfileId: fromProfile.id,
      ...(mergedPost.groupId ? { groupId: mergedPost.groupId } : {}),
      data: cancel,
    });
  }
};

const pushRenderer = async (notification: ExpandedNotification) => {
  const notice = isRsvpCancelNotice(notification.data)
    ? notification.data
    : { occurrenceIds: [], series: false };
  const name = eventName(notification.post ?? undefined);
  const when = whenText(notification.post ?? undefined, notice);
  return {
    title: `${profileName(notification.senderProfile!)} canceled their RSVP`,
    options: {
      body: [name, when].filter(Boolean).join(' · '),
      icon: getProfileAvatar(
        notification.senderProfile,
        await communityConfig(),
      ),
      actions: [
        {
          action: `goto:/posts/${notification.post?.id}`,
          title: 'View event',
        },
      ],
    },
    invalidateQueries: [
      PUSH_INVALIDATE.posts,
      PUSH_INVALIDATE.notifications,
      PUSH_INVALIDATE.notificationStats,
    ],
  };
};

export default {
  type: 'rsvpCanceled',
  event: 'rsvpCreated',
  eventHandler,
  pushRenderer,
} satisfies NotificationHandler;
