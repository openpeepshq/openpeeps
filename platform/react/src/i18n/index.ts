import i18next, { type InitOptions, type ResourceLanguage } from 'i18next';
import httpBackend from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';

export const initI18N = (lang: string, baseUrl: string, debug: boolean) => i18next
    .use(httpBackend)
    .use(initReactI18next)
    .init({
        lng: lang,
        fallbackLng: lang,
        debug,
        backend: {
            loadPath: `${baseUrl}/api/openpeeps/core/v1/i18n/{{lng}}`,
        },
    } as InitOptions & { resources?: ResourceLanguage });
