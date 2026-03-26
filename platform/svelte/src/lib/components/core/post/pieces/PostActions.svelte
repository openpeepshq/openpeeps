<script lang="ts">
	import type { PublicPost } from '@openpeeps/common/types';
	import ReplyButton from './actions/ReplyButton.svelte';
	import RepostButton from './actions/RepostButton.svelte';
	import ReactionButton from './actions/ReactionButton.svelte';
	import { me } from '$lib/api';
	import { preventDefault, stopPropagation } from '@openpeeps/ui';

	interface Props {
		post: PublicPost;
		compact?: boolean;
	}

	let { post, compact = false }: Props = $props();
</script>

{#if $me}
	<div
		class="mx-auto grid w-full grid-cols-3 items-center p-2 {compact ? '' : 'border-t'}"
		onclick={stopPropagation(preventDefault(() => {}))}
		onkeydown={stopPropagation(preventDefault(() => {}))}
		role="none"
	>
		<div class="hover:bg-surface-200 justify-self-start p-2">
			<ReplyButton {post} {compact} />
		</div>
		<div class="hover:bg-surface-200 justify-self-center p-2">
			<RepostButton {post} {compact} />
		</div>
		<div class="hover:bg-surface-200 justify-self-end p-2">
			<ReactionButton {post} {compact} />
		</div>
		<!-- <ShareButton {post} {compact} /> -->
	</div>
{/if}
