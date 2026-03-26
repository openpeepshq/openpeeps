<script lang="ts">
	import { Loader2 } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import { preventDefault, stopPropagation } from '$lib';
	interface Props {
		loading?: boolean;
		class?: string;
		disabled?: boolean;
		action?: string | (() => unknown);
		title?: string;
		mutations?: { isPending: boolean }[];
		children?: Snippet;
		newTab?: boolean;
	}

	let {
		loading = $bindable(false),
		class: additionalClasses = '',
		disabled = false,
		action = undefined,
		mutations = [],
		title = '',
		children,
		newTab = false
	}: Props = $props();

	$effect(() => {
		loading = !!mutations.find((m) => m.isPending);
	});
</script>

{#if typeof action === 'string'}
	<a
		{title}
		href={action}
		target={newTab ? '_blank' : undefined}
		onclick={loading || disabled ? preventDefault() : undefined}
		class="anchor {additionalClasses}"
	>
		{#if loading}
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
		{/if}
		{@render children?.()}
	</a>
{:else}
	<button
		{title}
		disabled={loading || disabled}
		onclick={stopPropagation(preventDefault(action))}
		class="anchor {additionalClasses}"
	>
		{#if loading}
			<Loader2 class="mr-2 h-4 w-4 animate-spin" />
		{/if}
		{@render children?.()}
	</button>
{/if}
