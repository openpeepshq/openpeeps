import { communityConfig, config } from '../config';
import nodemailer from 'nodemailer';
import type { Job } from 'bullmq';
import {
  CoreConfig,
  EmailOptions,
  RenderedEmail,
} from '@openpeepshq/common/types';
import { render } from './render';
import { logger } from '../log';

const serverLog = logger('openpeeps:email');

export type EmailJobLog = (message: string) => void | Promise<void>;

const logStep = async (log: EmailJobLog | undefined, message: string) => {
  if (!log) return;
  await log(message);
  serverLog.info(message);
};

const formatTransportSummary = (
  transportConfig: CoreConfig['email']['transportConfig'],
) => {
  if (!transportConfig) return '(no transport config)';
  const { host, port, secure, auth } = transportConfig;
  return JSON.stringify({
    host: host ?? null,
    port: port ?? null,
    secure: secure ?? null,
    authUser: auth?.user ?? null,
    authPass: auth?.pass ? '[set]' : auth ? '[empty]' : null,
  });
};

const formatErrorDetail = (err: unknown): string => {
  if (!(err instanceof Error)) return String(err);

  const nodemailerErr = err as Error & {
    code?: string;
    command?: string;
    response?: string;
    responseCode?: number;
  };

  const parts = [err.message];
  if (nodemailerErr.code) parts.push(`code=${nodemailerErr.code}`);
  if (nodemailerErr.command) parts.push(`command=${nodemailerErr.command}`);
  if (nodemailerErr.responseCode != null) {
    parts.push(`responseCode=${nodemailerErr.responseCode}`);
  }
  if (nodemailerErr.response) parts.push(`response=${nodemailerErr.response}`);
  return parts.join(' | ');
};

const logFailure = async (log: EmailJobLog | undefined, err: unknown) => {
  await logStep(log, `Failed: ${formatErrorDetail(err)}`);
  if (err instanceof Error && err.stack) {
    await logStep(log, err.stack);
  }
  if (err && typeof err === 'object' && 'cause' in err && err.cause) {
    await logStep(log, `Caused by: ${formatErrorDetail(err.cause)}`);
  }
};

export type SendEmailOptions = {
  /** Writes to BullMQ job logs when processing a queued email. */
  log?: EmailJobLog;
};

export const sendEmail = async (
  emailData: EmailOptions,
  coreConfig: CoreConfig,
  options?: SendEmailOptions,
) => {
  const log = options?.log;
  const localKeys = Object.keys(emailData.locals ?? {});

  await logStep(
    log,
    `Template "${emailData.template}" → ${emailData.to}${
      localKeys.length ? ` (locals: ${localKeys.join(', ')})` : ''
    }`,
  );
  await logStep(
    log,
    `defaultFrom=${coreConfig.email.defaultFrom ?? '(unset)'}`,
  );
  await logStep(
    log,
    `SMTP transport: ${formatTransportSummary(coreConfig.email.transportConfig)}`,
  );

  let renderedEmail: RenderedEmail;
  await logStep(log, 'Render in-process (worker templates)');
  try {
    renderedEmail = await render(emailData);
  } catch (err) {
    await logFailure(log, err);
    throw err;
  }

  await logStep(
    log,
    `Rendered subject="${renderedEmail.subject}" (html ${renderedEmail.html.length} chars, text ${renderedEmail.text.length} chars)`,
  );

  const communityConf = await communityConfig();
  const from = `"${communityConf.info.name}" <${coreConfig.email.defaultFrom}>`;

  await logStep(log, `Sending via SMTP as ${from}`);
  if (communityConf.info.contactEmail) {
    await logStep(log, `replyTo=${communityConf.info.contactEmail}`);
  }

  const emailTransport = nodemailer.createTransport(
    coreConfig.email.transportConfig,
  );

  try {
    const result = await emailTransport.sendMail({
      from,
      replyTo: communityConf.info.contactEmail,
      ...renderedEmail,
      ...(emailData.attachments?.length
        ? { attachments: emailData.attachments }
        : {}),
    });
    await logStep(
      log,
      `SMTP accepted message (messageId: ${result.messageId ?? 'n/a'}, response: ${result.response ?? 'n/a'})`,
    );
    if (result.rejected?.length) {
      await logStep(
        log,
        `SMTP rejected recipients: ${result.rejected.join(', ')}`,
      );
    }
    return result;
  } catch (err) {
    await logFailure(log, err);
    throw err;
  }
};

export const send = async (job: Job<EmailOptions>) => {
  const log: EmailJobLog = (message) => job.log(message).then(() => undefined);
  const attempt = job.attemptsMade + 1;

  await logStep(
    log,
    `Job ${job.id} started (attempt ${attempt}/${job.opts.attempts ?? 1}, name="${job.name}")`,
  );

  const coreConfig = await config();
  await logStep(log, 'Loaded core config');
  return sendEmail(job.data, coreConfig, { log });
};
