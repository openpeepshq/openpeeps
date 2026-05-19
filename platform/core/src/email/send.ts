import { communityConfig, config } from '../config';
import nodemailer from 'nodemailer';
import { Job } from 'bullmq';
import { jwtUtil } from '../jwt';
import { createServiceToken } from '../auth/tokens';
import {
  CoreConfig,
  EmailOptions,
  RenderedEmail,
  SuccessFailureResponse,
} from '@openpeeps/common/types';
import { fetchClient, typedPayloadEndpoint } from '@openpeeps/fetch-client';
import { serverRootUrl } from '../server';
import { render } from './render';

let renderToken: string | undefined = undefined;

const getRenderToken = async () => {
  if (!renderToken) {
    const authorization = await createServiceToken([
      {
        resource: { type: 'render', id: '*' },
      },
    ]);
    const jwt = await jwtUtil();
    renderToken = await jwt.sign(authorization);
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

/** HTTP render path for the email worker (templates live in the SvelteKit app). */
const renderEmailViaHttp = async (
  emailData: EmailOptions,
  coreConfig: CoreConfig,
): Promise<RenderedEmail> => {
  const token = await getRenderToken();
  const renderHostBaseUrl =
    coreConfig.email.renderHostBaseUrl || (await serverRootUrl());
  const baseUrl = `${renderHostBaseUrl}/api/openpeeps/core/v1`;

  const result = await renderEndpoint(emailData, {
    fetchClient: fetchClient({
      baseUrl,
      headers: { Authorization: `Bearer ${token}` },
    }),
  }).catch((err) => {
    throw new Error('Fetch failed: ' + err.message);
  });

  if ('data' in result) {
    return result.data;
  }

  throw new Error(
    'Error rendering email: ' + JSON.stringify(result.error.message),
  );
};

export type SendEmailOptions = {
  /**
   * Render in-process using registered templates.
   * Use from the SvelteKit app; the worker must use the default HTTP path.
   */
  renderLocally?: boolean;
};

export const sendEmail = async (
  emailData: EmailOptions,
  coreConfig: CoreConfig,
  options?: SendEmailOptions,
) => {
  const renderedEmail = options?.renderLocally
    ? await render(emailData)
    : await renderEmailViaHttp(emailData, coreConfig);

  const communityConf = await communityConfig();

  const emailTransport = nodemailer.createTransport(
    coreConfig.email.transportConfig,
  );

  return emailTransport.sendMail({
    from: `"${communityConf.info.name}" <${coreConfig.email.defaultFrom}>`,
    replyTo: communityConf.info.contactEmail,
    ...renderedEmail,
  });
};

export const send = async (job: Job<EmailOptions>) =>
  sendEmail(job.data, await config());
