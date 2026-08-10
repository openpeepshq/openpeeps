import { deepmerge } from 'deepmerge-ts';
import type { Resource, ResourceLanguage } from 'i18next';
import { i18nextResources } from '@openpeepshq/i18n';
import { allpeepDb } from '../db';
import { i18nEntries } from '../db/pg/schema/documents';
import { nowIso } from '../db/pg/mappers';
import { uuidv7 } from 'uuidv7';
import i18next from 'i18next';
import type { i18n } from 'i18next';
import Backend from 'i18next-fs-backend';

interface I18nContext {
  i18n: i18n;
  t: i18n['t'];
}

const I18N_NAMESPACE = 'translation';

export const i18nOverrides = () =>
  allpeepDb().then(async ({ db }) => {
    const rows = await db.select().from(i18nEntries);
    return Object.fromEntries(
      rows.map((row) => [row.locale, row.body as ResourceLanguage]),
    );
  });

export const i18nWithPlugins: () => Promise<Resource> = async () =>
  i18nextResources;

export const i18nComplete: () => Promise<Resource> = async () =>
  deepmerge(await i18nWithPlugins(), await i18nOverrides());

export const updateI18nOverrides = async (resources: Resource) =>
  allpeepDb().then(async ({ db }) => {
    const ts = nowIso();
    await Promise.all(
      Object.entries(resources).map(([locale, translations]) =>
        db
          .insert(i18nEntries)
          .values({
            id: uuidv7(),
            locale,
            namespace: I18N_NAMESPACE,
            body: translations,
            createdAt: ts,
            updatedAt: ts,
          })
          .onConflictDoUpdate({
            target: [i18nEntries.locale, i18nEntries.namespace],
            set: { body: translations, updatedAt: ts },
          }),
      ),
    );
  });

export const initI18nEmailContext = async (
  lng = 'en',
): Promise<I18nContext> => {
  const resources = await i18nComplete();
  const instance = i18next.use(Backend).createInstance({
    lng,
    fallbackLng: lng,
    resources: {
      [lng]: {
        translation: resources[lng],
      },
    },
    interpolation: {
      escapeValue: false,
    },
    debug: true,
  });

  await instance.init();

  return {
    t: instance.t,
    i18n: instance,
  };
};
