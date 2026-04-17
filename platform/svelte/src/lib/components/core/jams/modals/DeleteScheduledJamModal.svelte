<script lang="ts">
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { toast } from '$lib/utils/toast';
	import { Button, getModalManager } from '@openpeeps/ui';
	import { ModalFooter, ModalHeader, ModalWrapper } from '@openpeeps/ui';
	import { deletePostMutation } from '$lib/api';
	import { useQueryClient } from '@tanstack/svelte-query';
	import type { PublicPost } from '@openpeeps/common/types';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		event: PublicPost;
	}

	let { event }: Props = $props();

	// ------------ STORES --------------
	const toastStore = getToastStore();
	const modalManager = getModalManager();
	const queryClient = useQueryClient();

	const deleteEvent = deletePostMutation({
		id: event.id
	});

	const handleDeleteEvent = async () => {
		await deleteEvent(event);
		toastStore.trigger(
			toast({
				message: t('jams.modals.deleteScheduled.successToast'),
				background: 'variant-filled-success'
			})
		);
		await queryClient.invalidateQueries({ queryKey: ['jams'] });
		await queryClient.invalidateQueries({ queryKey: ['posts'] });
		modalManager.close();
	};
</script>

<ModalWrapper extraClassNames="md:w-1/3">
	<ModalHeader title={t('jams.modals.deleteScheduled.title')} />
	<article class=" flex flex-col">
		<div class="w-full p-2">
			{t('jams.modals.deleteScheduled.body')}
		</div>
	</article>
	<ModalFooter>
		<div></div>
		<div class="flex gap-x-2">
			<Button title={t('jams.modals.deleteScheduled.cancel')} variant="variant-ringed-surface" action={modalManager.close}
				>{t('jams.modals.deleteScheduled.cancel')}</Button
			>
			<Button title={t('jams.modals.deleteScheduled.deleteEventTitle')} variant="variant-filled-error" action={handleDeleteEvent}>
				{t('jams.modals.deleteScheduled.delete')}
			</Button>
		</div>
	</ModalFooter>
</ModalWrapper>
