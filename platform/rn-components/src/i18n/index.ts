import i18next from 'i18next';
import httpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import { BASE_URL } from '../lib/constants';

/**
 * Initialize before a screen mounts so useTranslation() never runs against an
 * uninitialized react-i18next / i18next instance (avoids subtle runtime errors).
 */
export function initI18nOnce() {
  const g = globalThis as { __OPENPEEPS_I18N_INIT__?: boolean };
  if (g.__OPENPEEPS_I18N_INIT__) {
    return;
  }
  g.__OPENPEEPS_I18N_INIT__ = true;

  i18next.use(initReactI18next);

  const baseUrl = BASE_URL?.trim();
  if (baseUrl) {
    i18next.use(httpBackend);
  }

  void i18next.init({
    compatibilityJSON: 'v4',
    lng: 'en',
    fallbackLng: 'en',
    debug: __DEV__,
    ns: ['translation'],
    defaultNS: 'translation',
    react: {
      useSuspense: false,
    },
    interpolation: {
      escapeValue: false,
    },
    ...(baseUrl
      ? {
          backend: {
            loadPath: `${baseUrl}/api/openpeeps/core/v1/i18n/{{lng}}`,
          },
        }
      : {}),
  });
}

initI18nOnce();

export default i18next;
