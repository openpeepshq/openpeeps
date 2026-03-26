<script lang="ts">
	interface Props {
		title?: string;
		message?: string;
		severity?: 'warning' | 'error';
		children?: import('svelte').Snippet;
		[key: string]: unknown;
	}

	let { title = '', message = '', severity = 'error', children, ...rest }: Props = $props();
</script>

<label class="label flex flex-col" {...rest}>
	<span>{title}</span>
	{@render children?.()}
	{#if message}
		<aside class="alert variant-{severity}-filled">
			<div class="alert-message">{message}</div>
		</aside>
	{/if}
</label>
