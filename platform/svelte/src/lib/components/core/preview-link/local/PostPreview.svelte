<script lang="ts">
	import { getPostStore } from '$lib/api';
	import { Loader } from '@openpeeps/ui';
	import FeedPostContent from '../../post/pieces/FeedPostContent.svelte';
	import AccessDenied from '../AccessDenied.svelte';

	interface Props {
		path: string;
	}

	let { path }: Props = $props();

	const postQuery = getPostStore(path.substring(7));

	const post = $derived($postQuery.data);
</script>

<Loader queries={[$postQuery]}>
	{#if post}
		<FeedPostContent {post} />
	{/if}
	{#snippet error()}
		<AccessDenied queries={[$postQuery]} />
	{/snippet}
</Loader>
