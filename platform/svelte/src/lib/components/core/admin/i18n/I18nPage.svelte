<script lang="ts">
	import { getI18nStore } from '$lib/api/admin/i18n';
	import { TextButton, Loader } from '@openpeeps/ui';
	import I18nEditor from './I18nEditor.svelte';
	import { getPageHeaderStore } from '$lib/stores';
	import type { Resource } from 'i18next';
	import { presetProps } from '$lib/utils';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();
	const i18nQuery = getI18nStore();
	type I18nData = { defaults: Resource; merged: Resource; overrides: Resource };
	const i18nData = $derived($i18nQuery.data as unknown as I18nData | undefined);
	const updateI18n = async (overrides: Resource) => {
		const response = await fetch('/api/openpeeps/core/v1/admin/i18n/overrides', {
			method: 'PUT',
			headers: {
				'content-type': 'application/json'
			},
			body: JSON.stringify(overrides)
		});
		if (!response.ok) {
			throw new Error('Failed to update i18n overrides');
		}
	};

	let newOverrides: Resource = $state({});

	getPageHeaderStore().set({
		title: t('admin.i18n.pageTitle') as string,
		actions: presetProps(TextButton, {
			variant: 'variant-filled-primary',
			text: t('admin.i18n.save') as string,
			action: () => updateI18n(newOverrides)
		}) as import('svelte').Component
	});
</script>

<div class="p-4">
	<h1 class="h1 mb-4">{t('admin.i18n.pageTitle')}</h1>
	<Loader queries={[$i18nQuery]}>
		{#if i18nData}
			<I18nEditor {...i18nData} bind:newOverrides />
		{/if}
	</Loader>
</div>
