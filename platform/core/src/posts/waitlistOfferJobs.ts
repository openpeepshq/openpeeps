import type {
  WaitlistEntryWrite,
  WaitlistSyncPlan,
} from '@openpeepshq/common/lib';
import { queueAndWorker } from '../jobs';
import { logger } from '../log';
import { maybeCreateNotification } from '../notifications/mutations';
import { findProfile } from '../profiles';
import {
  applyWaitlistSync,
  capacitySyncTargets,
  withRsvpCapacityLock,
} from './waitlist';
import { findPost } from './finders';

const log = logger('app:posts:waitlistOffer');

export interface WaitlistOfferJobData {
  postId: string;
  recurrenceId?: string;
}

const offerJobId = (
  postId: string,
  recurrenceId: string | undefined,
  profileId: string,
) =>
  `waitlist-offer-${postId}-${(recurrenceId ?? 'event').replace(/:/g, '_')}-${profileId}`;

const [waitlistOfferQueue, waitlistOfferWorker] = queueAndWorker<
  WaitlistOfferJobData,
  void
>(
  'waitlist-offer',
  async (job) => {
    const plans: WaitlistSyncPlan[] = [];
    let fromProfileId: string | undefined;
    await withRsvpCapacityLock(job.data.postId, async () => {
      let post = await findPost(job.data.postId);
      if (!post) return;
      fromProfileId = post.profile?.id;
      const targets = job.data.recurrenceId
        ? [job.data.recurrenceId]
        : capacitySyncTargets(post);
      for (const recurrenceId of targets) {
        if (!post) return;
        plans.push(await applyWaitlistSync(post, recurrenceId));
        post = await findPost(job.data.postId);
      }
    });
    await publishWaitlistPlans(job.data.postId, fromProfileId, plans);
  },
  {
    defaultJobOptions: {
      removeOnComplete: { age: 86400 },
      removeOnFail: { age: 86400 * 7, count: 50 },
    },
  },
);

export const scheduleWaitlistOffer = async (
  postId: string,
  offer: WaitlistEntryWrite,
) => {
  if (!offer.offerExpiresAt) return;
  try {
    const queue = waitlistOfferQueue();
    const jobId = offerJobId(postId, offer.recurrenceId, offer.profileId);
    await queue.remove(jobId).catch(() => undefined);
    const delay = Date.parse(offer.offerExpiresAt) - Date.now();
    if (delay <= 0) return;
    await queue.add(
      'offer',
      {
        postId,
        recurrenceId: offer.recurrenceId,
      },
      { jobId, delay },
    );
  } catch (err) {
    log.error({ err, postId }, 'Failed to schedule waitlist offer');
  }
};

export const cancelWaitlistOfferJob = async (
  postId: string,
  recurrenceId: string | undefined,
  profileId: string,
) => {
  try {
    const queue = waitlistOfferQueue();
    await queue.remove(offerJobId(postId, recurrenceId, profileId));
  } catch (err) {
    log.error({ err, postId, profileId }, 'Failed to cancel waitlist offer');
  }
};

export const publishWaitlistPlans = async (
  postId: string,
  fromProfileId: string | undefined,
  plans: WaitlistSyncPlan[],
) => {
  for (const plan of plans) {
    for (const cleared of plan.clearOffers) {
      await cancelWaitlistOfferJob(
        postId,
        cleared.recurrenceId,
        cleared.profileId,
      );
    }
    for (const offer of plan.offers) {
      try {
        await scheduleWaitlistOffer(postId, offer);
        if (!offer.offerExpiresAt) continue;
        const profile = await findProfile(offer.profileId);
        if (!profile) continue;
        await maybeCreateNotification(profile, {
          type: 'waitlistOffer',
          postId,
          ...(fromProfileId ? { fromProfileId } : {}),
          data: {
            offerExpiresAt: offer.offerExpiresAt,
            ...(offer.recurrenceId ? { recurrenceId: offer.recurrenceId } : {}),
          },
        });
      } catch (err) {
        log.error(
          { err, postId, profileId: offer.profileId },
          'waitlist offer notify failed',
        );
      }
    }
  }
};

export { waitlistOfferQueue, waitlistOfferWorker };
