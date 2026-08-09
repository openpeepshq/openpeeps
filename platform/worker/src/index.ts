import { sendEmailWorker } from '@openpeeps/core/email';
import { hub, onceWorker } from '@openpeeps/core/events';
import { queues } from '@openpeeps/core/jobs';
import { sendEmailQueue } from '@openpeeps/core/email';
import { onceQueue } from '@openpeeps/core/events';
import {
  ensureStreamingCleanupSchedule,
  mediaProcessingQueue,
  mediaProcessingWorker,
  mediaStreamingCleanupQueue,
  mediaStreamingCleanupWorker,
  mediaStreamingQueue,
  mediaStreamingWorker,
  registerStreamingPrewarmHandlers,
} from '@openpeeps/core/media';
import {
  analyticsCompileQueue,
  analyticsCompileWorker,
  ensureAnalyticsSchedules,
} from '@openpeeps/core/analytics';
import {
  jamRecordingStopQueue,
  jamRecordingStopWorker,
} from '@openpeeps/core/jams';
import { serverRootUrl } from '@openpeeps/core/server';
import {
  initializeNotifications,
  registerDefaultNotifications,
  notificationQueue,
  notificationWorker,
} from '@openpeeps/core/notifications';
import { registerRsvpConfirmationEmail } from '@openpeeps/core/posts';
import { refreshConfig, defaultConfig } from '@openpeeps/core/config';
import { initSentry } from '@openpeeps/core/sentry';

const startWorkers = () => {
  console.log('Starting email worker ...');
  sendEmailWorker();
  console.log('Starting once worker ...');
  onceWorker();
  console.log('Starting notification worker ...');
  notificationWorker();
  console.log('Starting media processing worker ...');
  mediaProcessingWorker();
  console.log('Starting media streaming worker ...');
  mediaStreamingWorker();
  console.log('Starting media streaming cleanup worker ...');
  mediaStreamingCleanupWorker();
  console.log('Starting jam recording stop worker ...');
  jamRecordingStopWorker();
  console.log('Starting analytics compile worker ...');
  analyticsCompileWorker();
};

const setupQueues = async () => {
  sendEmailQueue();
  onceQueue();
  notificationQueue();
  mediaProcessingQueue();
  mediaStreamingQueue();
  mediaStreamingCleanupQueue();
  jamRecordingStopQueue();
  analyticsCompileQueue();
  // Register the daily cron schedule. Idempotent under upsertJobScheduler so
  // it's safe to call on every worker boot.
  await ensureStreamingCleanupSchedule();
  await ensureAnalyticsSchedules();
};

const logJobStats = async () => {
  console.log('');
  console.log('==================================');
  console.log('  Worker stats at ' + new Date().toISOString());
  console.log('==================================');
  console.log('  Queue Stats');
  console.log('==================================');
  console.table(
    Object.fromEntries(
      await Promise.all(
        Object.entries(queues).map(async ([queueName, queue]) => [
          queueName,
          await queue.getJobCounts(),
        ]),
      ),
    ),
  );

  console.log('==================================');
  console.log('  Last five errors per queue');
  console.log('==================================');
  for (const queue of Object.values(queues)) {
    console.log(queue.name);
    for (const failedJob of (await queue.getFailed(0, 5)).filter(
      (job) => job.finishedOn > new Date().getTime() - 1000 * 60 * 60 * 24 * 7,
    )) {
      console.log(
        new Date(failedJob.finishedOn || 0).toISOString() +
          ' | ' +
          failedJob.name +
          ' | ' +
          failedJob.failedReason,
      );
    }
    console.log('==================================');
  }
  console.log('');
};
const initJobLogs = () =>
  Object.values(queues).forEach(async (queue) => {
    queue.on('error', (err) => console.log(err));
  });

export const start = async () => {
  const sentry = defaultConfig.services?.sentry;
  initSentry({
    enabled: sentry?.enabled,
    dsn: sentry?.dsn,
    hostname: defaultConfig.server.host,
    service: 'worker',
  });
  console.log('Using backend ' + (await serverRootUrl()));
  console.log('Registering config refresh listener...');
  hub.on('configUpdated', (namespace: string, name: string) => {
    console.log('Config updated:', namespace, name);
    refreshConfig(namespace, name);
  });
  console.log('Init notifications...');
  await initializeNotifications();
  console.log('Registering default notifications...');
  await registerDefaultNotifications();
  console.log('Registering RSVP confirmation email handler...');
  registerRsvpConfirmationEmail();
  console.log('Registering streaming prewarm handlers...');
  registerStreamingPrewarmHandlers();
  console.log('Setting up queues ...');
  await setupQueues();
  console.log('Setting up errorLogs ...');
  initJobLogs();
  console.log('Setting interval to log queue stats ...');
  setInterval(logJobStats, 60000);
  console.log('Starting workers ...');
  startWorkers();
  console.log('Started.');
  await logJobStats();
};
