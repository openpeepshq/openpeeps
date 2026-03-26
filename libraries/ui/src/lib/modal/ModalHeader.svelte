<script lang="ts">
	import { Button } from '../button';
	import { X } from 'lucide-svelte';
	import { getModalManager } from '.';

	interface Props {
		title?: string;
		hasCloseButton?: boolean;
		isCustomTitle?: boolean;
		children?: import('svelte').Snippet;
	}

	let { title = '', hasCloseButton = true, isCustomTitle = false, children }: Props = $props();

	const modalManager = getModalManager();
</script>

<style>
	:global(.modal-close-btn:focus) {
		outline: none !important;
		box-shadow: none !important;
		ring: 0 !important;
	}
</style>

<header
	class="sticky top-0 z-10 flex items-center justify-between border-b-[1px] border-surface-300 bg-surface-50 px-4 py-2 text-2xl font-bold"
>
	{#if isCustomTitle}
		{@render children?.()}
	{:else}
		<div class="flex items-center gap-3">
			<p class="text-lg font-medium">{title}</p>
		</div>
	{/if}
	{#if hasCloseButton}
		<Button
			title="Close"
			action={() => {
				modalManager.close();
			}}
			class="modal-close-btn flex h-12 w-12 items-center justify-center"
		>
			<X />
		</Button>
	{/if}
</header>
