<script lang="ts">
	import type { PublicPost } from '@openpeeps/common/types';
	import FeedNote from './FeedNote.svelte';

	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();
</script>

<FeedNote {post} />
