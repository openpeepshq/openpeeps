<script lang="ts">
	import { Ban } from 'lucide-svelte';
	import type { Component } from 'svelte';
	interface Props {
		key: string;
		registry: Map<string, Component<any>>;
		showError?: boolean;
	}

	let { key, registry, showError = true }: Props = $props();
</script>

{#if showError}
	<div class="alert variant-filled-error w-full">
		<!-- Icon -->
		<div><Ban /></div>
		<!-- Message -->
		<div class="alert-message">
			<h3 class="h3">Component not found</h3>
			<p class="w-full text-wrap">Component "{key}" not found in registry</p>
		</div>
	</div>
{/if}
