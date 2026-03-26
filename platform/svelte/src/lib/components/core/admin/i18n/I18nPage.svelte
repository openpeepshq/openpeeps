<script lang="ts">
	import { getI18nStore, updateI18nMutation } from '$lib/api/admin/i18n';
	import { TextButton, Loader } from '@openpeeps/ui';
	import I18nEditor from './I18nEditor.svelte';
	import { getPageHeaderStore } from '$lib/stores';
	import type { Resource } from 'i18next';
	import { presetProps } from '$lib/utils';

	const i18nQuery = getI18nStore();
	const updateI18n = updateI18nMutation();

	let newOverrides: Resource = $state({});

	getPageHeaderStore().set({
		title: 'Translations',
		actions: presetProps(TextButton, {
			variant: 'variant-filled-primary',
			text: 'Save',
			action: () => updateI18n(newOverrides)
		})
	});
</script>

<div class="p-4">
	<h1 class="h1 mb-4">Translations</h1>
	<Loader queries={[$i18nQuery]}>
		<I18nEditor {...$i18nQuery.data!} bind:newOverrides />
	</Loader>
</div>
