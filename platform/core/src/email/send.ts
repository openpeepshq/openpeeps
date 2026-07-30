import { communityConfig, config } from '../config';
import nodemailer from 'nodemailer';
import type { Job } from 'bullmq';
import { createSignedServiceToken } from '../accessTokens/tokens';
import {
  CoreConfig,
  EmailOptions,
  RenderedEmail,
  SuccessFailureResponse,
} from '@openpeeps/common/types';
import { fetchClient, typedPayloadEndpoint } from '@openpeeps/fetch-client';
import { serverRootUrl } from '../server';
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

let renderToken: string | undefined = undefined;

const getRenderToken = async () => {
  if (!renderToken) {
    const accessToken = await createSignedServiceToken({
      scopes: [
        {
          resource: { type: 'render', id: '*' },
        },
      ],
      name: 'render-email',
      expirationTime: '99y',
    });
    renderToken = accessToken.signedToken;
  }
  return renderToken;
};

const renderEndpoint = typedPayloadEndpoint<
  RenderedEmail,
  EmailOptions,
  SuccessFailureResponse
>({
  path: '/remote-control/render-email',
  method: 'post',
});

/** HTTP render path for the email worker (templates live in `@openpeeps/server`). */
const renderEmailViaHttp = async (
  emailData: EmailOptions,
  coreConfig: CoreConfig,
  log?: EmailJobLog,
): Promise<RenderedEmail> => {
  const renderHostBaseUrl =
    coreConfig.email.renderHostBaseUrl || (await serverRootUrl());
  const baseUrl = `${renderHostBaseUrl}/api/openpeeps/core/v1`;
  await logStep(
    log,
    `Render via HTTP: POST ${baseUrl}/remote-control/render-email`,
  );

  const token = await getRenderToken();

  const result = await renderEndpoint(emailData, {
    fetchClient: fetchClient({
      baseUrl,
      headers: { Authorization: `Bearer ${token}` },
    }),
  }).catch(async (err) => {
    await logFailure(log, err);
    throw new Error(
      'Fetch failed: ' + (err instanceof Error ? err.message : String(err)),
    );
  });

  if ('data' in result) {
    return result.data;
  }

  const renderError = new Error(
    'Error rendering email: ' + JSON.stringify(result.error.message),
  );
  await logFailure(log, renderError);
  throw renderError;
};

export type SendEmailOptions = {
  /**
   * Render in-process using registered templates.
   * Use from the API/server process; the worker must use the default HTTP path.
   */
  renderLocally?: boolean;
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
  if (options?.renderLocally) {
    await logStep(log, 'Render in-process (local templates)');
    try {
      renderedEmail = await render(emailData);
    } catch (err) {
      await logFailure(log, err);
      throw err;
    }
  } else {
    await logStep(log, 'Render via worker HTTP endpoint');
    renderedEmail = await renderEmailViaHttp(emailData, coreConfig, log);
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
  // Worker process registers React email templates at boot; render in-process
  // instead of round-tripping to the API server.
  return sendEmail(job.data, coreConfig, { log, renderLocally: true });
};
