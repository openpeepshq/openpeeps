<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<p class="text">
	{@render children?.()}
</p>

<style>
	p {
		margin-bottom: 1rem;
	}
</style>
