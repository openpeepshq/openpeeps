<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<section>
	{@render children?.()}
</section>

<style>
	section {
		margin-left: 0;
	}
</style>
