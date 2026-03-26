<script lang="ts">
	import { type Snippet } from 'svelte';
	import i18next, { type InitOptions } from 'i18next';
	import I18nContext from './I18nContext.svelte';
	import { client, throwError } from '$lib/api';

	let { children }: { children?: Snippet } = $props();

	let lang = $state('en');
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
