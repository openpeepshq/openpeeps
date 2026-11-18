import type {
  ExpandedNotification,
  NotificationHandler,
  PostWithMeta,
  Event,
  ProfileWithMeta,
} from '@openpeepshq/common/types';

import { maybeCreateNotification } from '@openpeepshq/core/notifications';
import {
  getJamUrl,
  occurrenceForJamStart,
  profileName,
} from '@openpeepshq/common/lib';
import { listJamStarts } from '../../../jams/finders';
import { PUSH_INVALIDATE } from '../../pushInvalidation';
import { jamStartAudience } from './recipients';

// The start row is written in the same request, then the notification is
// queued. They are not linked by id, so match on time.
const START_MATCH_WINDOW_MS = 15 * 60 * 1000;

const storedRecurrenceId = (data: unknown): string | undefined => {
  if (!data || typeof data !== 'object' || !('recurrenceId' in data)) {
    return undefined;
  }
  const recurrenceId = data.recurrenceId;
  return typeof recurrenceId === 'string' ? recurrenceId : undefined;
};

const recurrenceIdFromStart = async (postId: string, at: Date) => {
  const target = at.getTime();
  let closest: { recurrenceId: string; delta: number } | undefined;
  for (const start of await listJamStarts(postId)) {
    if (!start.recurrenceId) continue;
    const delta = Math.abs(new Date(start.createdAt).getTime() - target);
    if (!closest || delta < closest.delta) {
      closest = { recurrenceId: start.recurrenceId, delta };
    }
  }
  if (!closest || closest.delta > START_MATCH_WINDOW_MS) return undefined;
  return closest.recurrenceId;
};

const eventHandler = async (...args: unknown[]) => {
  const [profile, post, recurrenceId] = args as [
    ProfileWithMeta,
    PostWithMeta,
    string | undefined,
  ];
  const jam = post.data?.type === 'event' && post.data?.jam;

  if (!jam) {
    return;
  }

  const notify = (recipientProfile: ProfileWithMeta, groupId?: string) =>
    maybeCreateNotification(recipientProfile, {
      type: 'jamStarted',
      fromProfileId: profile.id,
      postId: post.id,
      ...(groupId ? { groupId } : {}),
      ...(recurrenceId ? { data: { recurrenceId } } : {}),
    });

  const { profiles: recipients, groupId } = await jamStartAudience(
    profile,
    post,
    recurrenceId,
  );
  for (const recipientProfile of recipients) {
    await notify(recipientProfile, groupId);
  }
};

const expander = async (notification: ExpandedNotification) => {
  const post = notification.post;
  if (!post || post.data?.type !== 'event' || !post.data.recurrence) {
    return notification;
  }
  const at = new Date(notification.createdAt);
  const occurrence = occurrenceForJamStart(post.data, {
    recurrenceId:
      storedRecurrenceId(notification.data) ??
      (await recurrenceIdFromStart(post.id, at)),
    at,
  });
  if (!occurrence) return notification;
  return {
    ...notification,
    post: {
      ...post,
      occurrenceRecurrenceId: occurrence.recurrenceId,
      occurrenceStart: occurrence.start,
      ...(occurrence.end ? { occurrenceEnd: occurrence.end } : {}),
    },
  };
};

const pushRenderer = async (notification: ExpandedNotification) => ({
  title: `${profileName(notification.senderProfile!)} started a jam`,
  options: {
    body: (notification.post?.data as Event)?.name,
    actions: [
      {
        action: `goto:${getJamUrl(
          notification.post?.id ?? '',
          undefined,
          notification.post?.occurrenceRecurrenceId,
        )}`,
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
  expander,
  pushRenderer,
} satisfies NotificationHandler;
