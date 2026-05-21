import type { EmailGlobals, EmailOptions } from '@openpeeps/common/types';
import { communityConfig, config } from '../config';
import { convert } from 'html-to-text';
import { registeredTemplates } from './registry';
import { serverRootUrl } from '../server';
import { initI18nEmailContext } from '../i18n';

const globals = async (): Promise<EmailGlobals> => {
  const serverConfig = await config();
  const rootUrl =
    serverConfig.email.renderHostBaseUrl?.trim() || (await serverRootUrl());
  return {
    communityConfig: await communityConfig(),
    serverData: {
      rootUrl,
      iosUrl: serverConfig.apps.ios.url,
      androidUrl: serverConfig.apps.android.url,
    },
    i18nContext: await initI18nEmailContext(),
  } as EmailGlobals;
};

export const render = async (emailData: EmailOptions) => {
  const locals = emailData.locals;

  const render = registeredTemplates.get(emailData.template);

  if (!render) {
    throw Error(`No renderer registered for ${emailData.template}`);
  }

  const { html, subject } = await render({
    ...emailData,
    globals: await globals(),
    locals: locals || {},
  });

  const text = convert(html);

  return {
    to: emailData.to,
    template: emailData.template,
    subject,
    html,
    text,
  };
};
