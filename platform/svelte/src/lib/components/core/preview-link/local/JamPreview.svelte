<script lang="ts">
	import { getPostStore } from '$lib/api';
	import FeedPostContent from '../../post/pieces/FeedPostContent.svelte';
	import { AccessDeniedLoader } from '$lib/components/layout';

	interface Props {
		path: string;
	}

	let { path }: Props = $props();

	const postQuery = getPostStore(path.substring(8, 44));

	const post = $derived($postQuery.data);
</script>

<AccessDeniedLoader queries={[$postQuery]}>
	{#if post}
		<FeedPostContent {post} />
	{/if}
</AccessDeniedLoader>
