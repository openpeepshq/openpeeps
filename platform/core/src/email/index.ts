import { EmailOptions, EmailService } from '@openpeeps/common/types';
import { logger } from '../log';
import { sendEmailQueue } from './jobs';
import { render } from './render';

const log = logger('allpeep:email');

const defaultEmailService: EmailService = {
  send: async (emailOptions: EmailOptions) =>
    sendEmailQueue()
      .add(`${emailOptions.template}->${emailOptions.to}`, emailOptions)
      .catch(log.error)
      .then(),
  render: async (emailOptions: EmailOptions) => render(emailOptions),
};

export const emailService = async () => defaultEmailService;
export { sendEmailWorker, sendEmailQueue } from './jobs';
export { registerEmailRenderer } from './registry';
