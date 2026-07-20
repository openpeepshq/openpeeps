import { queueAndWorker } from '../jobs';
import { EmailOptions } from '@openpeeps/common/types';
import { send } from './send';
import { SentMessageInfo } from 'nodemailer';

export const SEND_EMAIL_QUEUE_NAME = 'send-email';

const [sendEmailQueue, sendEmailWorker] = queueAndWorker<
  EmailOptions,
  SentMessageInfo
>(SEND_EMAIL_QUEUE_NAME, (job) => send(job), {
  defaultJobOptions: {
    removeOnComplete: { age: 86400 }, // Remove successful tasks after 1 day
    removeOnFail: {
      age: 86400 * 7,
      count: 50,
    }, // Remove failed tasks after 7 days and after 50 failed tasks
  },
});
export { sendEmailQueue, sendEmailWorker };
