<script lang="ts">
	// @ts-nocheck
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { Button } from '@openpeeps/ui';
	import { deleteGroupMutation } from '$lib/api';
	import { toast } from '$lib/utils/toast';
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import type { GroupWithMeta } from '@openpeeps/common/types';
	import { groupName } from '@openpeeps/common/lib';
	import { i18nContext } from '$lib/components/i18n';

	interface Props {
		group: GroupWithMeta;
		callback?: ()=>void
	}

	let { group , callback}: Props = $props();
	const { t } = i18nContext();
	const modalManager = getModalManager();
	const toastStore = getToastStore();

	const deleteGroup = deleteGroupMutation({
		id: group.id
	});

	const handleDeletePost = async () => {
		await deleteGroup()
			.then(() => {
				toastStore.trigger(
					toast({
						message: t('groups.delete.successMessage'),
						background: 'variant-filled-success'
					})
				);
				callback?.()
				modalManager.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('groups.delete.toastError'),
						background: 'variant-filled-error'
					})
				);
			});
	};
</script>

<ModalWrapper extraClassNames="max-w-sm">
	<ModalHeader title={t('groups.delete.title')} />
	<article class=" overflow-h-scroll m-4 max-h-[65vh] pb-3">
		<p class="my-4">
			{t('groups.delete.description', {
				groupName: groupName(group)
			})}
		</p>
	</article>
	<ModalFooter>
		<Button
			title={t('groups.delete.confirm')}
			action={handleDeletePost}
			variant="variant-filled-error"
			mutations={[$deleteGroup]}
		>
			{t('groups.delete.deleteButton')}
		</Button>
		<Button
			title={t('groups.delete.cancel')}
			action={() => modalManager.close()}
			variant="variant-ringed-surface">{t('groups.delete.cancel')}</Button
		>
	</ModalFooter>
</ModalWrapper>
