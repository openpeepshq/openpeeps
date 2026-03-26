import { getContext } from 'svelte';
import type { I18nContext } from './types';

export { default as I18nProvider } from './I18nProvider.svelte';

export const i18nContext = () => getContext<I18nContext>('allpeep-i18n');