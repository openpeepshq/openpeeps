<script lang="ts">
	import type { PublicPost } from '@openpeeps/common/types';
	import { Avatar } from '../../profile';
	import PostMenu from './PostMenu.svelte';
	import DisplayUserNameBlock from '$lib/components/core/profile/DisplayUserNameBlock.svelte';
	import { UpdatingDate } from '@openpeeps/ui';

	interface Props {
		post: PublicPost;
		showMenu: boolean;
		deleteCallback?: () => void;
	}

	let { post, showMenu, deleteCallback = () => undefined }: Props = $props();
</script>

<div class="flex justify-between py-5">
	<div class="flex w-fit space-x-2">
		<a href={`/@${post.profile.handle}`}>
			<Avatar profile={post?.profile} size={4} />
		</a>
		<div class="flex flex-col flex-wrap">
			<DisplayUserNameBlock profile={post.profile} />
			<span class="text-sm font-extralight">
				<UpdatingDate date={post.createdAt} />
			</span>
		</div>
	</div>
	{#if showMenu}
		<PostMenu {post} {deleteCallback} />
	{/if}
</div>
