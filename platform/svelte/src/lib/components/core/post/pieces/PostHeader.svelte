<script lang="ts">
	import { truncateText } from '@openpeeps/common/lib';
	import type { PublicPost } from '@openpeeps/common/types';
	import { Avatar } from '../../profile';
	import PostMenu from './PostMenu.svelte';
	import { UpdatingDate } from '@openpeeps/ui';

	interface Props {
		displayedPost: PublicPost;
		reply?: PublicPost;
		showReplyMarker: boolean;
		showAsParent: boolean;
		deleteCallback: () => void;
		type?: 'feed' | 'full';
	}

	let {
		displayedPost,
		reply,
		showReplyMarker,
		showAsParent,
		deleteCallback,
		type = 'full'
	}: Props = $props();

	let displayedPostProfile = $derived(displayedPost.profile);
</script>

<div class="flex justify-between px-5 py-5">
	<div class="flex w-fit space-x-2">
		<a href={`/@${displayedPostProfile?.handle}`}>
			{#if reply && showReplyMarker && type === 'full'}
				<div class="bg-surface-300 absolute left-[50px] top-0 h-[1.25rem] w-1"></div>
			{/if}
			<Avatar profile={displayedPostProfile} size={4} />
			{#if showAsParent}
				<div class="bg-surface-300 absolute left-[50px] top-[84px] h-full w-1"></div>
			{/if}
		</a>
		<div class="flex flex-col flex-wrap">
			<a href={`/@${displayedPostProfile?.handle}`}>
				<p class="text-sm capitalize hover:underline">
					{truncateText(displayedPostProfile?.displayName || displayedPostProfile?.handle, 30)}
				</p>
			</a>
			<a href={`/@${displayedPostProfile?.handle}`}>
				<p class="text-sm font-light hover:underline">
					@{truncateText(displayedPostProfile?.handle, 30)}
				</p>
			</a>
			<span class="text-sm font-extralight">
				<UpdatingDate date={displayedPost.createdAt} />
			</span>
		</div>
	</div>
	<PostMenu post={displayedPost} {deleteCallback} />
</div>
