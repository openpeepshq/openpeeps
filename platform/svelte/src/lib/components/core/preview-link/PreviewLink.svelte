<script lang="ts">
	import { page } from '$app/state';
	import { isLocalLink, isValidUrl } from './helpers';
	import LocalPreviewLink from './LocalPreviewLink.svelte';
	import RemotePreviewLink from './RemotePreviewLink.svelte';
	interface Props {
		url?: string;
	}

	let { url = '' }: Props = $props();

	const isValid = $derived(url && isValidUrl(url));

	const isLocal = $derived(isValid && isLocalLink(url, page.url.origin));
</script>

{#if isValid}
	{#if isLocal}
		<LocalPreviewLink {url} />
	{:else}
		<RemotePreviewLink {url} />
	{/if}
{/if}
