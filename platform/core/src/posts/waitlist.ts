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

// key2 = 42 is deliberately distinct from SCHEMA_MIGRATE_LOCK.key2 (1) so
// per-post capacity locks can never collide with schema migration locks.
const WAITLIST_LOCK_KEY2 = 42;

const hashPostId = (postId: string): number => {
  let h = 0;
  for (let i = 0; i < postId.length; i += 1) {
    h = Math.imul(h, 31) + postId.charCodeAt(i);
  }
  // Ensure a non-zero key1 to avoid the default-key1 path in withPostgresAdvisoryLock.
  return h | 0 || 1;
};

export const rsvpCapacityLockKeys = (postId: string) => ({
  key1: hashPostId(postId),
  key2: WAITLIST_LOCK_KEY2,
});

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
  const profileIds = [...new Set(writes.map((w) => w.profileId))];
  const profiles = new Map<string, Awaited<ReturnType<typeof findProfile>>>(
    await Promise.all(
      profileIds.map(async (id) => [id, await findProfile(id)] as const),
    ),
  );
  for (const write of writes) {
    const profile = profiles.get(write.profileId);
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
