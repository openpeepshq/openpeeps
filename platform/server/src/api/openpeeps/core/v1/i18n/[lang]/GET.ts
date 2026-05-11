import { endpoint, z } from '#lib/endpoint';
import { notFound } from '#lib/errors';
import { i18nComplete } from '@openpeeps/core/i18n';
import { i18nResourceLanguageSchema } from '@openpeeps/common';


export const Param = z.object({
  lang: z.string(),
});

export const Output = i18nResourceLanguageSchema;

export const Error = {
  404: notFound(),
};

export const apiEndpoint = endpoint({ Param, Output, Error }).handle(async (input) => {
  const { lang } = input;
  const resources = await i18nComplete();

  if (!resources[lang]) {
    throw notFound('Language not supported.');
  }

  return resources[lang];
});
