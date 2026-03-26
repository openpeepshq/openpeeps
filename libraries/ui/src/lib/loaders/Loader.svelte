<script lang="ts">
	import { LoadingIcon, WaitForQueries } from '.';
	import type { QueryObserverResult } from '@tanstack/svelte-query';

	interface Props {
		fullScreen?: boolean;
		loadingMessage?: string;
		errorMessage?: string;
		classes?: string;
		queries?: QueryObserverResult<unknown, unknown>[];
		promises?: Promise<unknown>[];
		ignoreErrors?: boolean;
		children?: import('svelte').Snippet;
		loading?: import('svelte').Snippet;
		error?: import('svelte').Snippet;
	}

	let {
		fullScreen = false,
		loadingMessage = '',
		errorMessage = 'An error occurred.',
		classes = '',
		queries,
		promises,
		ignoreErrors = false,
		children,
		loading: loadingLocal,
		error: errorLocal
	}: Props = $props();

	const backgroundClass =
		'flex flex-col items-center justify-center w-full z-30 bg-surface-50/80 p-10 ' +
		(fullScreen ? 'h-full fixed left-0 top-0 ' : '') +
		classes;
</script>

<WaitForQueries {queries} {promises} {ignoreErrors}>
	{#snippet success()}
		{@render children?.()}
	{/snippet}
	{#snippet loading()}
		<div class={backgroundClass}>
			{#if loadingLocal}
				{@render loadingLocal()}
			{:else}
				<LoadingIcon />
				<p class="mt-3">{loadingMessage}</p>
			{/if}
		</div>
	{/snippet}
	{#snippet error()}
		<div class={backgroundClass}>
			{#if errorLocal}
				{@render errorLocal()}
			{:else}
				<p>{errorMessage}</p>
			{/if}
		</div>
	{/snippet}
</WaitForQueries>
