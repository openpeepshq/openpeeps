import { queueAndWorker } from '../jobs';
import { ExpandedNotification, Json } from '@openpeeps/common/types';
import { emailService } from '../email';
import { findProfile } from '../profiles';
import { notificationSettings } from './helpers';
import { notificationHandlers } from './handlers';
import { doPush } from './push';
import { findByProfile } from '../accounts';
import { updateNotification } from './mutations';
import { getNotificationStats } from './finders';
import { findProfileSettings } from '../profileSettings';

const [notificationQueue, notificationWorker] = queueAndWorker<
    ExpandedNotification,
    void
>(
    'process-notification',
    async (job) => {
        const notification = job.data;

        console.log('processing notification in worker:', notification.id);
        const profile = await findProfile(notification.recipientProfile.id);

        if (!profile) {
            console.warn('Profile not found for notification:', notification.id);
            return;
        }

        const profileSettings = await findProfileSettings(profile.id);

        if (!profileSettings) {
            console.warn('Profile settings not found for notification:', notification.id);
            return;
        }

        const { push, email } = notificationSettings(profileSettings, notification.type);

        const accounts = await findByProfile(profile);
        const mailer = await emailService();

        const notificationStats = await getNotificationStats(profile);

        for (const account of accounts) {
            if (email) {
                await mailer.send({
                    template: `notification-${notification.type}`,
                    to: account.email,
                    locals: notification as unknown as Record<string, Json>,
                });
            }

            if (push) {
                await doPush(
                    await notificationHandlers
                        .get(notification.type)
                        ?.pushRenderer(notification),
                    notificationStats,
                    account,
                );
            }
        }

        await updateNotification(notification, {
            emailHandled: true,
            pushHandled: true,
        });
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
