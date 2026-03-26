<script lang="ts">
	import A from './a.svelte';

	interface MentionProps {
		handle: string;
		displayName?: string | undefined;
		newTab?: boolean | ((link: string) => boolean);
	}

	let { handle, displayName = undefined, newTab = false }: MentionProps = $props();

	let href = `/@${handle}`;
	let title = displayName || handle;
</script>

<A {href} {title} {newTab}>
	@{handle}
</A>
