import { jobLogger, logFailure, logStep, queueAndWorker } from '../jobs';
import { ExpandedNotification, Json } from '@openpeepshq/common/types';
import { emailService } from '../email';
import { findProfile } from '../profiles';
import { notificationSettings } from './helpers';
import { notificationHandlers } from './handlers';
import { doPush } from './push';
import { findByProfile } from '../accounts';
import { updateNotification } from './mutations';
import { getNotificationStats } from './finders';
import { findProfileSettings } from '../profileSettings';
import { logger } from '../log';

const log = logger('core:notifications:worker');

const [notificationQueue, notificationWorker] = queueAndWorker<
  ExpandedNotification,
  void
>(
  'process-notification',
  async (job) => {
    const notification = job.data;
    const jobLog = jobLogger(job);

    await logStep(
      jobLog,
      log,
      `Processing notification ${notification.id} (type=${notification.type}) ` +
        `for profile ${notification.recipientProfile.id} ` +
        `(attempt ${job.attemptsMade + 1}/${job.opts.attempts ?? 1})`,
    );

    const profile = await findProfile(notification.recipientProfile.id);

    if (!profile) {
      await logFailure(
        jobLog,
        log,
        `Profile ${notification.recipientProfile.id} not found; skipping notification ${notification.id}`,
      );
      return;
    }

    const profileSettings = await findProfileSettings(profile.id);

    if (!profileSettings) {
      await logFailure(
        jobLog,
        log,
        `Profile settings for ${profile.id} not found; skipping notification ${notification.id}`,
      );
      return;
    }

    const { push, email } = notificationSettings(
      profileSettings,
      notification.type,
    );

    const accounts = await findByProfile(profile);
    const mailer = await emailService();

    const notificationStats = await getNotificationStats(profile);

    await logStep(
      jobLog,
      log,
      `Resolved ${accounts.length} account(s) for profile ${profile.id}; ` +
        `delivery channels: email=${email} push=${push}`,
    );

    for (const account of accounts) {
      if (email) {
        await logStep(
          jobLog,
          log,
          `Queueing email notification to ${account.email}`,
        );
        try {
          await mailer.send({
            template: `notification-${notification.type}`,
            to: account.email,
            locals: notification as unknown as Record<string, Json>,
          });
          await logStep(
            jobLog,
            log,
            `Queued email notification to ${account.email}`,
          );
        } catch (error) {
          await logFailure(
            jobLog,
            log,
            `email notification to ${account.email} failed to queue`,
            error,
          );
        }
      }

      if (push) {
        try {
          await doPush(
            await notificationHandlers
              .get(notification.type)
              ?.pushRenderer(notification),
            notificationStats,
            account,
            jobLog,
          );
        } catch (error) {
          await logFailure(
            jobLog,
            log,
            `push delivery to account ${account.id} (${account.email}) threw`,
            error,
          );
        }
      }
    }

    await updateNotification(notification, {
      emailHandled: true,
      pushHandled: true,
    });

    await logStep(
      jobLog,
      log,
      `Notification ${notification.id} processed (email and push handled)`,
    );
  },
  {
    defaultJobOptions: {
      removeOnComplete: { age: 86400 },
      removeOnFail: {
        age: 86400 * 7,
        count: 50,
      },
    },
  },
);

export { notificationQueue, notificationWorker };
