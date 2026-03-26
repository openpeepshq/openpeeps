<script lang="ts">
	import { Loader } from 'lucide-svelte';
	import type { Snippet } from 'svelte';
	import type { IconType } from '$lib';
	import { preventDefault, stopPropagation } from '$lib';

	interface Props {
		action: string | (() => Promise<unknown> | unknown);
		text?: string;
		loadingText?: string;
		icon?: IconType;
		danger?: boolean;
		compact?: boolean;
		title?: string;
		textSnippet?: Snippet;
	}
	let {
		action,
		text = '',
		loadingText = '',
		icon: Icon = undefined,
		danger = false,
		compact = false,
		title = '',
		textSnippet = undefined
	}: Props = $props();

	let isLoading = $state(false);

	const buttonClass =
		'w-full flex p-2 hover:bg-surface-hover-token rounded items-center gap-x-2 text-left';
</script>

{#snippet content()}
	{#if isLoading}
		<Loader size={16} class="flex-0" />
		{#if !compact}
			<span>{loadingText || text}</span>
		{/if}
	{:else}
		{#if Icon}
			<Icon size={16} class="flex-shrink-0" />
		{/if}
		{#if !compact}
			{#if textSnippet}
				{@render textSnippet()}
			{:else}
				<span class="text-left">{text}</span>
			{/if}
		{/if}
	{/if}
{/snippet}

{#if typeof action === 'string'}
	<a
		{title}
		href={action}
		class={buttonClass}
		onclick={stopPropagation(() => {
			isLoading = true;
		})}
	>
		{@render content()}
	</a>
{:else}
	<button
		{title}
		class:text-error-600={danger}
		class:justify-center={compact}
		class={buttonClass}
		onclick={stopPropagation(
			preventDefault(async () => {
				isLoading = true;
				await action();
				isLoading = false;
			})
		)}
		disabled={isLoading}
	>
		{@render content()}
	</button>
{/if}
