<script lang="ts">
	import { setContext } from 'svelte';
	import { preventDefault } from '$lib';

	interface Props {
		error?: string;
		className?: string;
		handleSubmit?: any;
		validate?: any;
		children?: import('svelte').Snippet;
	}

	let {
		error = '',
		className = '',
		handleSubmit = () => {},
		validate = undefined,
		children
	}: Props = $props();
	setContext('form-validate-function', validate);
</script>

<form onsubmit={preventDefault(handleSubmit)} class={className}>
	{#if error}
		<div
			class="bg-surface-300-600-token flex w-full justify-center rounded border border-red-500 py-2 text-sm text-red-500"
		>
			<p>{error}</p>
		</div>
	{/if}
	{@render children?.()}
</form>
