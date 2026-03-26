<script lang="ts">
	import PostActionButton from './PostActionButton.svelte';
	import { Reply } from 'lucide-svelte';
	import type { PublicPost } from '@openpeeps/common/types';
	import { ReplyModal } from '$lib/components/core/post';
	import { getModalManager } from '@openpeeps/ui';
	import { me } from '$lib/api';
	import { hasValue } from '@openpeeps/common';

	const modalManager = getModalManager();

	interface Props {
		post: PublicPost;
		compact?: boolean;
	}

	let { post, compact = false }: Props = $props();

	const handleReply = () => {
		modalManager.show(ReplyModal, {
			inReplyTo: post
		});
	};
	let isGroupPost = $derived(hasValue(post.groupId));

	let text: string = $derived(compact ? String(post.replyCount) : 'Reply');
	let membershipExists = $derived(
		$me.memberships.map((m) => m.group.id).find((groupId) => groupId === post?.group?.id)
			? true
			: false
	);
</script>

<PostActionButton
	icon={Reply}
	action={handleReply}
	{text}
	disabled={isGroupPost && !membershipExists}
/>
