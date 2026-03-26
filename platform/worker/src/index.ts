import { sendEmailWorker } from '@openpeeps/core/email';
import { hub, onceWorker } from '@openpeeps/core/events';
import { queues } from '@openpeeps/core/jobs';
import { sendEmailQueue } from '@openpeeps/core/email';
import { onceQueue } from '@openpeeps/core/events';
import { serverRootUrl } from '@openpeeps/core/server';
import { initializeNotifications, registerDefaultNotifications } from '@openpeeps/core/notifications';
import { refreshConfig } from '@openpeeps/core/config';

const startWorkers = () => {
  console.log('Starting email worker ...');
  sendEmailWorker();
  console.log('Starting once worker ...');
  onceWorker();
};

const setupQueues = () => {
  sendEmailQueue();
  onceQueue();
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
    for (const failedJob of (await queue.getFailed(0, 5)).filter((job) => job.finishedOn > new Date().getTime() - 1000 * 60 * 60 * 24 * 7)) {
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
  console.log('Setting up queues ...');
  setupQueues();
  console.log('Setting up errorLogs ...');
  initJobLogs();
  console.log('Setting interval to log queue stats ...');
  setInterval(logJobStats, 60000);
  console.log('Starting workers ...');
  startWorkers();
  console.log('Started.');
  await logJobStats();
};
