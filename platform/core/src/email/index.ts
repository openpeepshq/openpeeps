import { EmailOptions, EmailService } from '@openpeeps/common/types';
import { logger } from '../log';
import { sendEmailQueue } from './jobs';
import { render } from './render';

const log = logger('openpeeps:email');

const defaultEmailService: EmailService = {
  send: async (emailOptions: EmailOptions) =>
    sendEmailQueue()
      .add(`${emailOptions.template}->${emailOptions.to}`, emailOptions)
      .catch(log.error)
      .then(),
  render: async (emailOptions: EmailOptions) => render(emailOptions),
};

export const emailService = async () => defaultEmailService;

export const queueTestEmail = async (to: string) =>
  (await emailService()).send({ to, template: 'test' });

export { sendEmailWorker, sendEmailQueue } from './jobs';
export { registerEmailRenderer } from './registry';
export { sendEmail } from './send';
export { sendSmtpTestEmail } from './smtpTest';
export { getSendEmailQueueStats } from './queueStats';
export { SEND_EMAIL_QUEUE_NAME } from './jobs';
