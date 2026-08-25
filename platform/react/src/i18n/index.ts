import i18next, {
  type InitOptions,
  type ResourceLanguage,
  type i18n as I18nInstance,
} from 'i18next';
import httpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

/** UI languages with bundled / API locale packs. */
export const AVAILABLE_UI_LANGUAGES = ['en', 'de'] as const;
export type UiLanguage = (typeof AVAILABLE_UI_LANGUAGES)[number];

export const isUiLanguage = (
  value: string | null | undefined,
): value is UiLanguage =>
  !!value && (AVAILABLE_UI_LANGUAGES as readonly string[]).includes(value);

/**
 * Language before profile settings are available.
 * Preference: community default → browser → English.
 */
export const resolveInitialLanguage = (
  communityDefault?: string | null,
): string => {
  if (isUiLanguage(communityDefault)) return communityDefault;
  const nav =
    typeof navigator !== 'undefined'
      ? navigator.language?.slice(0, 2)
      : undefined;
  if (isUiLanguage(nav)) return nav;
  return 'en';
};

/**
 * Effective UI language once profile settings may be loaded.
 * Preference: profile setting → community default → browser → English.
 */
export const resolveProfileLanguage = (
  profileLanguage?: string | null,
  communityDefault?: string | null,
): string => {
  if (isUiLanguage(profileLanguage)) return profileLanguage;
  return resolveInitialLanguage(communityDefault);
};

export const initI18N = (
  lang: string,
  baseUrl: string,
  debug = false,
): Promise<I18nInstance> => {
  const instance = i18next.createInstance();
  return instance
    .use(httpBackend)
    .use(initReactI18next)
    .init({
      lng: lang,
      fallbackLng: lang,
      debug,
      interpolation: {
        escapeValue: false,
      },
      backend: {
        loadPath: `${baseUrl}/api/openpeeps/core/v1/i18n/{{lng}}`,
      },
    } as InitOptions & { resources?: ResourceLanguage })
    .then(() => instance);
};

export { I18nProvider } from './I18nProvider';
export type { I18nProviderProps } from './I18nProvider';
export { useT, useI18n, I18nContext } from './context';
