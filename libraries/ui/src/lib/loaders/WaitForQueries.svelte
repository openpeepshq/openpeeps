<script lang="ts">
	import type { PartialQueryObserverResult } from '../types';

	interface Props {
		queries?: PartialQueryObserverResult<unknown>[];
		promises?: Promise<unknown>[];
		ignoreErrors?: boolean;
		loading?: import('svelte').Snippet;
		success?: import('svelte').Snippet;
		error?: import('svelte').Snippet;
		children?: import('svelte').Snippet;
	}

	let {
		queries,
		promises,
		ignoreErrors = false,
		loading,
		success,
		error,
		children
	}: Props = $props();

	let combinedPromise = Promise.all(promises ?? []);
</script>

{#await combinedPromise}
	{@render loading?.()}
{:then result}
	{#if queries?.find((q) => q.isPending)}
		{@render loading?.()}
	{:else if !queries || queries.every((q) => q.isSuccess) || ignoreErrors}
		{@render success?.()}
	{:else}
		{@render error?.()}
	{/if}
{:catch rejection}
	{@debug rejection}
	{#if ignoreErrors}
		{@render success?.()}
	{:else}
		{@render error?.()}
	{/if}
{/await}

{#if children}
	{@render children()}
{/if}
