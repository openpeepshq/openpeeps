import { communityConfig, config } from '../config';
import nodemailer from 'nodemailer';
import { Job } from 'bullmq';
import { jwtUtil } from '../jwt';
import { createServiceToken } from '../auth/tokens';
import {
  EmailOptions,
  RenderedEmail,
  SuccessFailureResponse,
} from '@openpeeps/common/types';
import { fetchClient, typedPayloadEndpoint } from '@openpeeps/fetch-client';
import { serverRootUrl } from '../server';

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

const renderServerBaseUrl = () =>
  config().then((config) => config.email.renderHostBaseUrl || serverRootUrl());

export const send = async (job: Job<EmailOptions>) => {
  const renderToken = await getRenderToken();
  const emailData = job.data;

  const baseUrl = `${await renderServerBaseUrl()}/api/openpeeps/core/v1`;

  const renderedEmail = await renderEndpoint(emailData, {
    fetchClient: fetchClient({
      baseUrl,
      headers: { Authorization: `Bearer ${renderToken}` },
    }),
  })
    .catch((err) => {
      console.log(baseUrl);
      console.log(err);
      throw new Error('Fetch failed: ' + err.message);
    })
    .then((r) => {
      if ('data' in r) {
        return r.data;
      } else {
        throw new Error(
          'Error rendering email: ' + JSON.stringify(r.error.message),
        );
      }
    });

  const coreConfig = await config();
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
