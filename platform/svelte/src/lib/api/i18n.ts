import { client, simpleStore } from "./helpers";

export const i18nTranslationsStore = (lang: string) => simpleStore(client.i18n.translations, { pathParams: { lang } });

export const i18nLanguagesStore = () => simpleStore(client.i18n.languages);

