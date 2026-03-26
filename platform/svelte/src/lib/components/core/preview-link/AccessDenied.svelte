<script lang="ts">
	import { EyeOff } from 'lucide-svelte';
	import type { QueryObserverResult } from '@tanstack/svelte-query';
	import type { Snippet } from 'svelte';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		message?: string;
		errorMessage?: string;
		queries: QueryObserverResult<unknown, unknown>[];
		error?: Snippet;
	}

	const { t } = i18nContext();

	let {
		queries,
		error,
		message = t('visibility.accessDenied'),
		errorMessage = 'An error occurred.'
	}: Props = $props();

	async function isClientError() {
		const errorQuery = queries?.find((q) => q.isError);
		if (!errorQuery) return false;

		return await errorQuery.promise
			.then((result: any) => result?.status === 'rejected')
			.catch(() => true);
	}
</script>

{#await isClientError() then isClient}
	{#if isClient}
		<span class="flex flex-col items-center justify-center gap-2">
			<EyeOff class="h-12 w-12" />
			<p>{message}</p>
		</span>
	{:else if error}
		{@render error()}
	{:else}
		<p>{errorMessage}</p>
	{/if}
{/await}
