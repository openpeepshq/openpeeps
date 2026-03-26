<script lang="ts">
	import type { PublicPost } from '@openpeeps/common/types';
	import FeedEvent from './FeedEvent.svelte';

	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();
</script>

<FeedEvent {post} />
