import type { PostWithMeta, RSVP } from '@openpeepshq/common/types';
import {
  planWaitlistSync,
  type WaitlistSyncPlan,
} from '@openpeepshq/common/lib';
import { listRsvpOccurrences } from '@openpeepshq/common/lib';
import { logger } from '../log';
import { allpeepDb } from '../db';
import { withPostgresAdvisoryLock } from '../db/pg/client';
import { findProfile } from '../profiles';
import { findPost } from './finders';
import { entryConnector } from './helpers';

const log = logger('app:posts:waitlist');

const MIGRATE_LOCK_KEY = 8742301;

export const rsvpCapacityLockKeys = (postId: string) => {
  let h1 = 0;
  let h2 = 0;
  for (let i = 0; i < postId.length; i += 1) {
    h1 = Math.imul(h1, 33) + postId.charCodeAt(i);
    h2 = Math.imul(h2, 31) + postId.charCodeAt(i);
  }
  const key1 = h1 | 0 || 481516;
  let key2 = h2 | 0 || 1;
  if (key1 === MIGRATE_LOCK_KEY && key2 === 1) key2 = 2;
  return { key1, key2 };
};

export const withRsvpCapacityLock = <T>(
  postId: string,
  fn: () => Promise<T>,
): Promise<T> => {
  const keys = rsvpCapacityLockKeys(postId);
  return withPostgresAdvisoryLock(keys.key1, keys.key2, fn);
};

export const capacitySyncTargets = (
  post: PostWithMeta,
  occurrenceIds?: string[],
): Array<string | undefined> => {
  const event = post.data?.type === 'event' ? post.data : undefined;
  if (!event?.maxAttendees) return [];
  if (!event.recurrence) return [undefined];
  if (occurrenceIds?.length) return occurrenceIds;
  const upcoming = listRsvpOccurrences(event).map(
    (occurrence) => occurrence.recurrenceId,
  );
  return upcoming.length ? upcoming : [undefined];
};

export const applyWaitlistSync = async (
  post: PostWithMeta,
  recurrenceId: string | undefined,
  now = Date.now(),
): Promise<WaitlistSyncPlan> => {
  const plan = planWaitlistSync(post, recurrenceId, now);
  const writes = [...plan.requeues, ...plan.withdraws, ...plan.offers];
  if (!writes.length) return plan;

  const { db } = await allpeepDb();
  for (const write of writes) {
    const profile = await findProfile(write.profileId);
    if (!profile) {
      log.error({ profileId: write.profileId }, 'waitlist profile missing');
      continue;
    }
    const data: RSVP = {
      response: 'waitlist',
      ...(write.recurrenceId ? { recurrenceId: write.recurrenceId } : {}),
      waitlistJoinedAt: write.waitlistJoinedAt,
      ...(write.offerExpiresAt ? { offerExpiresAt: write.offerExpiresAt } : {}),
    };
    await entryConnector(db, profile, post, { type: 'rsvp', data });
  }
  return plan;
};

export const syncCapacityOccurrences = async (
  postId: string,
  occurrenceIds: Array<string | undefined>,
  now = Date.now(),
) => {
  const plans: WaitlistSyncPlan[] = [];
  let post = await findPost(postId);
  for (const recurrenceId of occurrenceIds) {
    if (!post || post.data?.type !== 'event' || !post.data.maxAttendees) {
      break;
    }
    plans.push(await applyWaitlistSync(post, recurrenceId, now));
    post = await findPost(postId);
  }
  return { post, plans };
};
