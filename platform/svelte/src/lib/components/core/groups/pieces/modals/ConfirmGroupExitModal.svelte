<script lang="ts">
	import { exitMutation } from '$lib/api';
	import { getModalManager, ModalFooter, ModalHeader, ModalWrapper, Button } from '@openpeeps/ui';
	import { toast } from '$lib/utils/toast';
	import type { GroupWithMeta, PublicProfile } from '@openpeeps/common/types';
	import { getToastStore } from '@skeletonlabs/skeleton';
	import { goto } from '$app/navigation';
	import { i18nContext } from '$lib/components/i18n';

	const { t } = i18nContext();

	interface Props {
		group: GroupWithMeta;
		profile: PublicProfile;
	}

	let { group, profile }: Props = $props();
	const modalManager = getModalManager();
	const toastStore = getToastStore();

	const leaveGroup = exitMutation({ id: group.id });

	const doExit = async () => {
		leaveGroup()
			.then(async () => {
				toastStore.trigger(
					toast({
						message: t('groups.leave.removedToast')
					})
				);
				await goto('/groups');
				modalManager.close();
			})
			.catch(() => {
				toastStore.trigger(
					toast({
						message: t('groups.leave.removeErrorToast')
					})
				);
			});
	};
</script>

<ModalWrapper>
	<ModalHeader title={t('groups.modals.confirmExit.title')} />
	<div class="p-4">
		{t('groups.modals.confirmExit.body', { handle: group.handle })}
	</div>
	<ModalFooter extraClassNames="flex justify-end w-full">
		<Button title={t('common.cancel')} variant="variant-ringed-primary" action={modalManager.close}
			>{t('common.cancel')}</Button
		>
		<Button title={t('groups.modals.confirmExit.leave')} variant="variant-filled-error" action={doExit}>{t('groups.modals.confirmExit.leave')}</Button>
	</ModalFooter>
</ModalWrapper>
