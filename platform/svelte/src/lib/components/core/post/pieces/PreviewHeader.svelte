<script lang="ts">
	import type { PublicPost, PublicProfile } from '@openpeeps/common/types';
	import { truncateText } from '@openpeeps/common/lib';
	import PostMenu from './PostMenu.svelte';
	import { UpdatingDate } from '@openpeeps/ui';

	interface Props {
		displayedPost: PublicPost;
		displayedPostProfile: PublicProfile;
		deleteCallback?: () => void;
	}

	let { displayedPost, displayedPostProfile, deleteCallback = () => {} }: Props = $props();
</script>

<div class="flex justify-between">
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
	</div>
	<div class="flex gap-1">
		<h3 class="my-auto text-sm font-extralight">
			<UpdatingDate date={displayedPost.createdAt} />
		</h3>
		<PostMenu post={displayedPost} {deleteCallback} />
	</div>
</div>
