import type { FetchClient } from '@openpeeps/fetch-client';
import type { ResourceLanguage } from 'i18next';
import { allpeepNoPayloadEndpoint } from './helpers';

export const i18n = (rawClient: FetchClient) => ({
    translations: allpeepNoPayloadEndpoint<ResourceLanguage, { lang: string }>(
        rawClient,
        '/i18n/:lang',
    ),
    languages: allpeepNoPayloadEndpoint<string[]>(
        rawClient,
        '/i18n/languages',
    ),
}); 