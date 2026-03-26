<script lang="ts">
	import PostActionButton from './PostActionButton.svelte';
	import { Share } from 'lucide-svelte';
	import type { PublicPost } from '@openpeeps/common/types';

	interface Props {
		post: PublicPost;
		compact?: boolean;
	}

	let { post, compact = false }: Props = $props();

	const handleShare = () => window.alert(`Sharing post ${post.id}`);

	let text: string = $derived(compact ? '' : 'Reply');
</script>

<PostActionButton icon={Share} {text} action={handleShare} />
