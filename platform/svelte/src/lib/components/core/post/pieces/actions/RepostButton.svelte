<script lang="ts">
	import PostActionButton from './PostActionButton.svelte';
	import { Repeat } from 'lucide-svelte';
	import type { PublicPost } from '@openpeeps/common/types';
	import { toast } from '$lib/utils/toast';
	import { currentProfileReposts } from '$lib/api';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { repostMutation, retractRepostMutation } from '$lib/api';
	import { me } from '$lib/api';
	import { hasValue } from '@openpeeps/common';

	interface Props {
		post: PublicPost;
		compact?: boolean;
	}

	let { post = $bindable(), compact = false }: Props = $props();

	const toastStore = getToastStore();
	const myRepostsStore = currentProfileReposts();
	const retractRepost = retractRepostMutation();
	const repost = repostMutation({ id: post.id });

	const handleRepost = async () => {
		if (myRepost) {
			post.repostCount = post.repostCount - 1;
			isReposted = false;
			await retractRepost({ id: myRepost.id });
			toastStore.trigger(
				toast({
					message: 'Repost retracted',
					background: 'variant-filled-success'
				})
			);
		} else {
			post.repostCount = post.repostCount + 1;
			isReposted = true;
			await repost(post);
			toastStore.trigger(
				toast({
					message: 'Reposted successfully!',
					background: 'variant-filled-success'
				})
			);
		}
	};

	let text: string = $derived(compact ? String(post.repostCount) : 'Repost');
	let myRepost: PublicPost | undefined = $derived(
		$myRepostsStore.data?.find((p) => p.repost?.id === post.id)
	);
	let isReposted: boolean = $derived(!!myRepost);
	let isGroupPost = $derived(hasValue(post.groupId));
	let membershipExists = $derived(
		$me.memberships.map((m) => m.group.id).find((groupId) => groupId === post?.group?.id)
			? true
			: false
	);
</script>

<PostActionButton
	icon={Repeat}
	action={handleRepost}
	active={isReposted}
	{text}
	disabled={isGroupPost && !membershipExists}
/>
