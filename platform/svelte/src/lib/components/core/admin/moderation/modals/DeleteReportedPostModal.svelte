<script lang="ts">
	import { deletePostMutation } from '$lib/api';
	import { i18nContext } from '$lib/components/i18n';
	import { toast } from '$lib/utils';
	import { Button, getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { getToastStore } from '@skeletonlabs/skeleton';

	interface Props {
		postId: string;
		deleteCallback?: (() => void) | undefined;
	}

	let { postId, deleteCallback = undefined }: Props = $props();
	const modalManager = getModalManager();
	const toastStore = getToastStore();
	const { t } = i18nContext();

	const deletePost = deletePostMutation({
		id: postId
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
	<ModalHeader title={t('admin.moderation.post.delete.title')} />
	<article class="  m-4 h-full pb-3">
		<p class="my-4">{t('admin.moderation.post.delete.description')}</p>
	</article>
	<ModalFooter>
		<Button
			title={t('admin.moderation.post.delete.cancel')}
			action={() => modalManager.close()}
			variant="variant-ringed-surface"
			class="w-full"
		>
			{t('admin.moderation.post.delete.cancel')}
		</Button>
		<Button
			title={t('admin.moderation.post.delete.confirm')}
			action={handleDeletePost}
			variant="variant-filled-error"
			class="w-full"
		>
			{t('admin.moderation.post.delete.confirm')}
		</Button>
	</ModalFooter>
</ModalWrapper>
