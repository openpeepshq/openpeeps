import type { i18n } from 'i18next';

export interface I18nContext {
    i18n: i18n;
    t: i18n['t'];
}
