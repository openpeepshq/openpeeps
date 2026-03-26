import { deepmerge } from 'deepmerge-ts';
import type { Resource, ResourceLanguage } from 'i18next';
import { i18nextResources } from '@openpeeps/i18n';
import { query } from '@openpeeps/arango-querybuilder';
import { allpeepDb } from '../db';
import i18next from 'i18next';
import type { i18n } from 'i18next';
import Backend from 'i18next-fs-backend';

interface I18nContext {
    i18n: i18n;
    t: i18n['t'];
}

export const i18nOverrides = () => allpeepDb()
    .then(({ db }) => query<{ _key: string, translations: ResourceLanguage }>()
        .collection({ alias: 'i18n', collection: 'i18n' })
        .all(db))
    .then(docs => Object.fromEntries(docs.map(doc => [doc._key, doc.translations])));

export const i18nWithPlugins: () => Promise<Resource> = async () => i18nextResources;

export const i18nComplete: () => Promise<Resource> = async () =>
    deepmerge(await i18nWithPlugins(), await i18nOverrides());

export const updateI18nOverrides = async (resources: Resource) => allpeepDb()
    .then(async ({ db }) => {
        console.log(resources);
        Object.entries(resources).forEach(([lang, translations]) => {
            db.collection('i18n').save({
                _key: lang,
                translations
            }, { overwriteMode: 'replace' });
        });
    });

export const initI18nEmailContext = async (lng = 'en'): Promise<I18nContext> => {
    const resources = await i18nComplete()
    const instance = i18next.use(Backend)
        .createInstance({
            lng,
            fallbackLng: lng,
            resources: {
                [lng]: {
                    translation: resources[lng]
                }
            },
            interpolation: {
                escapeValue: false
            },
            debug: true,
        })

    await instance.init()

    return {
        t: instance.t,
        i18n: instance,
    };
};
