<script lang="ts">
	import { ChevronDown, ChevronRight } from 'lucide-svelte';
	import type { Snippet } from 'svelte';

	const {
		title,
		children,
		initialOpen = false
	}: { title: Snippet; children: Snippet; initialOpen?: boolean } = $props();

	let open = $state(initialOpen);
</script>

<div class="flex items-start gap-2">
	<button onclick={() => (open = !open)} class="w-4">
		{#if open}
			<ChevronDown />
		{:else}
			<ChevronRight />
		{/if}
	</button>
	<div class="flex-grow">
		<div>
			{@render title()}
		</div>
		{#if open}
			<div>
				{@render children()}
			</div>
		{/if}
	</div>
</div>
