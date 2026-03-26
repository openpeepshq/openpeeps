<script lang="ts">
	import type { PublicPost } from '@openpeeps/common/types';
	import { postReactionStats } from '../helpers';
	import { getModalManager } from '@openpeeps/ui';
	import ReactionsModal from './modals/ReactionsModal.svelte';
	import RepostModal from './modals/RepostModal.svelte';
	import { preventDefault, stopPropagation } from '@openpeeps/ui';

	const modalManager = getModalManager();

	interface Props {
		post: PublicPost;
	}

	let { post }: Props = $props();

	let reactionStats: string = $derived(post ? postReactionStats(post) : '');
</script>

<div class="flex justify-between pb-2">
	<div>
		{#if post?.reactions?.length}
			<button
				title="View reactions"
				class="text-surface-500 text-xs hover:underline"
				onclick={stopPropagation(
					preventDefault(() => modalManager.show(ReactionsModal, { reactions: post.reactions }))
				)}
				onkeydown={stopPropagation(
					preventDefault(() => modalManager.show(ReactionsModal, { reactions: post.reactions }))
				)}
			>
				{reactionStats}
			</button>
		{/if}
	</div>
	<div class="text-surface-500 flex w-fit items-center gap-1 text-xs">
		{#if post?.replyCount}
			<h3 class="hover:underline">{post?.replyCount} replies</h3>
		{/if}
		{#if post?.replyCount && post?.repostCount}
			<div>·</div>
		{/if}
		{#if post?.repostCount}
			<button
				title="View reposts"
				onclick={stopPropagation(preventDefault(() => modalManager.show(RepostModal, { post })))}
				onkeydown={stopPropagation(preventDefault(() => modalManager.show(RepostModal, { post })))}
				class="hover:underline"
			>
				{post?.repostCount} reposts
			</button>
		{/if}
	</div>
</div>
