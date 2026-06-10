import i18next, {
  type InitOptions,
  type ResourceLanguage,
  type i18n as I18nInstance,
} from 'i18next';
import httpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

export const initI18N = (
  lang: string,
  baseUrl: string,
  debug = false,
): Promise<I18nInstance> =>
  i18next
    .use(httpBackend)
    .use(initReactI18next)
    .init({
      lng: lang,
      fallbackLng: lang,
      debug,
      backend: {
        loadPath: `${baseUrl}/api/openpeeps/core/v1/i18n/{{lng}}`,
      },
    } as InitOptions & { resources?: ResourceLanguage })
    .then(() => i18next);

export { I18nProvider } from './I18nProvider';
export type { I18nProviderProps } from './I18nProvider';
export { useT, useI18n, I18nContext } from './context';
