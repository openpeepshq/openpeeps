<script lang="ts">
	import Header from './Header.svelte';
	interface Props {
		children?: import('svelte').Snippet;
	}

	let { children }: Props = $props();
</script>

<Header level="2">
	{@render children?.()}
</Header>
