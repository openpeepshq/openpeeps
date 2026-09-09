import type { EmailGlobals, EmailOptions } from '@openpeepshq/common/types';
import { FALLBACK_TIME_ZONE, resolveTimeZone } from '@openpeepshq/common/lib';
import { communityConfig, config } from '../config';
import { convert } from 'html-to-text';
import { registeredTemplates } from './registry';
import { serverRootUrl } from '../server';
import { initI18nEmailContext } from '../i18n';

const localTimeZone = (locals: EmailOptions['locals']): string | undefined => {
  const value = locals?.timeZone;
  return typeof value === 'string' ? value : undefined;
};

const globals = async (
  locals?: EmailOptions['locals'],
): Promise<EmailGlobals> => {
  const serverConfig = await config();
  const rootUrl = await serverRootUrl();
  const community = await communityConfig();
  return {
    communityConfig: community,
    serverData: {
      rootUrl,
      iosUrl: serverConfig.apps.ios.url,
      androidUrl: serverConfig.apps.android.url,
    },
    i18nContext: await initI18nEmailContext(),
    timeZone: resolveTimeZone(
      localTimeZone(locals),
      community.settings?.defaultTimeZone,
      FALLBACK_TIME_ZONE,
    ),
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
    globals: await globals(locals),
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
