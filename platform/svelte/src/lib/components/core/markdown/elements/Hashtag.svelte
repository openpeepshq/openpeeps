<script lang="ts">
	import A from './a.svelte';

	interface Props {
		tag: string;
		newTab?: boolean | ((link: string) => boolean);
	}

	let { tag, newTab = false }: Props = $props();

	let title = `#${tag}`;
	let href = `/tags/${tag}`;
</script>

<A {href} {title} {newTab}>
	#{tag}
</A>
