<script lang="ts">
	import { getContext, type Snippet } from 'svelte';
	import i18next, { type InitOptions } from 'i18next';
	import I18nContext from './I18nContext.svelte';
	import { client, throwError } from '$lib/api';
	import { browser } from '$app/environment';
	import type { ServerDataContext } from '$lib/components/serverData/types';

	let { children }: { children?: Snippet } = $props();

	const serverData = getContext<ServerDataContext>('allpeep-server-data');
	const communityDefault = serverData?.serverInfo?.communityConfig?.settings?.defaultLanguage;
	const storedLang = browser ? localStorage.getItem('openpeeps-language') : null;
	let lang = $state(storedLang || communityDefault || 'en');
	let instancePromise = $derived(
		client.i18n
			.translations({ pathParameters: { lang } })
			.then(throwError())
			.then(
				(translation): InitOptions => ({
					lng: lang,
					resources: {
						[lang]: { translation }
					},
					fallbackLng: 'en',
					interpolation: {
						escapeValue: false
					},
					debug: true
				})
			)
			.then(async (config) => {
				const instance = i18next.createInstance(config);
				await instance.init();
				return instance;
			})
	);
</script>

{#await instancePromise then i18n}
	<I18nContext {i18n}>
		{@render children?.()}
	</I18nContext>
{/await}
