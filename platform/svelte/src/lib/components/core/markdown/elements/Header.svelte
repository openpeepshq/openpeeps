<script lang="ts">
	interface Props {
		level: string;
		children?: import('svelte').Snippet;
	}

	let { level, children }: Props = $props();
	const className = `h${level}`;
</script>

<svelte:element this={className} class={className}>
	{@render children?.()}
</svelte:element>

<style>
	h1,
	h2,
	h3,
	h4 {
		font-weight: bold;
		margin-top: 1em;
		margin-bottom: 0.5em;
	}
</style>
