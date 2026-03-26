<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { Button } from '@openpeeps/ui';
	import FeedPost from '../../feed/chronological/FeedPost.svelte';
	import { deletePostMutation } from '$lib/api';
	import { toast } from '$lib/utils/toast';
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import type { PublicPost } from '@openpeeps/common/types';
	import PreviewNote from '../../types/note/PreviewNote.svelte';
	import PreviewEvent from '../../types/event/PreviewEvent.svelte';
	import PreviewPoll from '../../types/poll/PreviewPoll.svelte';

	interface Props {
		post: PublicPost;
		deleteCallback?: (() => void) | undefined;
	}

	let { post, deleteCallback = undefined }: Props = $props();

	const modalManager = getModalManager();
	const toastStore = getToastStore();

	const deletePost = deletePostMutation({
		id: post.id
	});

	const handleDeletePost = async () => {
		await deletePost();
		toastStore.trigger(
			toast({
				message: 'Post deleted successfully!',
				background: 'variant-filled-success'
			})
		);

		deleteCallback?.();

		modalManager.close();
	};
</script>

<ModalWrapper extraClassNames="relative">
	<ModalHeader title={'Delete Post'} />
	<article class="  m-4 h-full pb-3">
		<FeedPost {post} />
		<p class="my-4">Are you sure you want to delete this post?</p>
	</article>
	<ModalFooter>
		<Button
			title="Delete Post"
			action={handleDeletePost}
			variant="variant-filled-error"
			class="w-full">Delete</Button
		>
		<Button
			title="Cancel"
			action={() => modalManager.close()}
			variant="variant-ringed-surface"
			class="w-full"
		>
			Cancel
		</Button>
	</ModalFooter>
</ModalWrapper>
