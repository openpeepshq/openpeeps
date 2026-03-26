<script lang="ts">
	import FeedPoll from './FeedPoll.svelte';
	import type { PublicPost } from '@openpeeps/common/types';

	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();
</script>

<FeedPoll {post} />
