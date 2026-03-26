<script lang="ts">
	import FeedPost from './FeedPost.svelte';
	import { getPostStore } from '$lib/api';
	import { Pin } from 'lucide-svelte';
	import { WaitForQueries } from '@openpeeps/ui';

	interface Props {
		pinnedPostId: string;
		inGroup?: boolean;
	}

	let { pinnedPostId, inGroup = false }: Props = $props();

	const postStore = getPostStore(pinnedPostId);
</script>

<WaitForQueries queries={[$postStore]}>
	{#if $postStore.data}
		<a
			href="/posts/{$postStore.data?.repost ? $postStore.data?.repost?.id : $postStore.data?.id}"
			class="bg-surface-300"
		>
			<div class="px-5 pt-3 text-sm">
				<Pin class="mr-1 inline-block size-4" />
				Pinned post
			</div>
			<FeedPost post={$postStore.data} inGroup />
		</a>
	{/if}
</WaitForQueries>
