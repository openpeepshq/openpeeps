<script lang="ts">
	import { setContext, type Snippet } from 'svelte';
	import type { I18nContext } from './types';
	import type { i18n as I18nType } from 'i18next';

	let { i18n, children }: { i18n: I18nType; children: Snippet } = $props();

	setContext<I18nContext>('allpeep-i18n', {
		i18n: i18n,
		t: i18n.t
	});
</script>

{@render children?.()}
